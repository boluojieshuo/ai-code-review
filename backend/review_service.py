from sqlalchemy.orm import Session
from models import Review, ReviewIssue
from schemas import ReviewCreate
from llm_service import review_code


def create_review(db: Session, review_data: ReviewCreate, user_id: int):
    db_review = Review(
        user_id=user_id,
        file_name=review_data.file_name,
        language=review_data.language,
        code_content=review_data.code_content,
        status="pending",
        review_type=review_data.review_type,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    llm_params = {
        "code_content": review_data.code_content,
        "language": review_data.language,
        "file_name": review_data.file_name,
        "code_snippet": review_data.code_content,
    }

    result = None
    if review_data.review_type == "general":
        result = review_code(review_type="general", **llm_params)
    elif review_data.review_type == "improve":
        result = review_code(review_type="improve", specific_issues=review_data.specific_issues, **llm_params)
    elif review_data.review_type == "correct":
        result = review_code(review_type="correct", error_message=review_data.error_message, **llm_params)
    elif review_data.review_type == "critical_check":
        result = review_code(review_type="critical_check", **llm_params)

    if not result:
        db_review.status = "failed"
        db.commit()
        db.refresh(db_review)
        return db_review

    db_review.status = "completed"

    # Non-general reviews are simple passthroughs
    if review_data.review_type != "general":
        if review_data.review_type == "improve":
            db_review.improved_code = result.get("improved_code", "")
            db_review.summary = result.get("summary", "")
        elif review_data.review_type == "correct":
            db_review.corrected_code = result.get("corrected_code", "")
            db_review.corrected_explanation = result.get("explanation", "")
        elif review_data.review_type == "critical_check":
            db_review.has_critical_issue = result.get("has_critical_issue", False)
            db_review.critical_issue_type = result.get("issue_type")
            db_review.critical_issue_description = result.get("description")
            db_review.critical_issue_suggestion = result.get("suggestion")
            db_review.improved_code = result.get("improved_code", "")
        db.commit()
        db.refresh(db_review)
        return db_review

    # ── General review flow ──
    db_review.overall_score = result.get("overall_score", 0)
    db_review.summary = result.get("summary", "")

    issues = result.get("issues", [])
    code_lines = review_data.code_content.splitlines()

    # Step 1 ─ collect fix list & call ONE improve
    fix_list = []
    for issue_data in issues:
        sev = issue_data.get("severity", "info")
        line = issue_data.get("line_number", "?")
        desc = issue_data.get("description", "")
        sug = issue_data.get("suggestion", "")
        if sev in ("critical", "major", "minor"):
            fix_list.append(f"第{line}行 [{sev}] {desc} → {sug}")

    improved_full = None
    if fix_list:
        fix_text = "\n".join(fix_list)
        ir = review_code(review_type="improve", specific_issues=fix_text, **llm_params)
        if ir:
            improved_full = ir.get("improved_code", "")
            if improved_full and improved_full.strip() != review_data.code_content.strip():
                db_review.improved_code = improved_full
                s = ir.get("summary", "")
                if s:
                    db_review.summary = (db_review.summary or "") + f"\n改进总结: {s}"

    improved_lines = improved_full.split("\n") if improved_full else []

    # Step 2 ─ create issue records with snippets
    fixed_snippets = {}
    for issue_data in issues:
        severity = issue_data.get("severity", "info")
        line_number = issue_data.get("line_number")

        db_issue = ReviewIssue(
            review_id=db_review.id,
            line_number=line_number,
            severity=severity,
            category=issue_data.get("category", "style"),
            description=issue_data.get("description", ""),
            suggestion=issue_data.get("suggestion", ""),
        )

        if severity in ("critical", "major", "minor"):
            # Try extracting from improved_full first
            if line_number is not None and improved_lines:
                line_idx = line_number - 1
                start = max(0, line_idx - 3)
                end = min(len(improved_lines), line_idx + 4)
                snippet = "\n".join(improved_lines[start:end]).strip()
                if snippet:
                    db_issue.improved_code_snippet = snippet
                    fixed_snippets[line_number] = snippet

            # Fallback: per-issue LLM
            if not db_issue.improved_code_snippet:
                code_snippet_to_improve = ""
                if line_number is not None:
                    line_idx = line_number - 1
                    if 0 <= line_idx < len(code_lines):
                        start_line = max(0, line_idx - 3)
                        end_line = min(len(code_lines), line_idx + 4)
                        code_snippet_to_improve = "\n".join(code_lines[start_line:end_line])
                if not code_snippet_to_improve:
                    code_snippet_to_improve = review_data.code_content[:3000]

                iir = review_code(
                    review_type="improve_issue",
                    code_content=review_data.code_content,
                    language=review_data.language,
                    file_name=review_data.file_name,
                    code_snippet=code_snippet_to_improve,
                    issue_description=issue_data["description"],
                    issue_suggestion=issue_data.get("suggestion", ""),
                )
                if iir:
                    improved_snippet = iir.get("improved_code_snippet", "").strip()
                    if improved_snippet:
                        db_issue.improved_code_snippet = improved_snippet
                        if line_number is not None:
                            fixed_snippets[line_number] = improved_snippet

        db.add(db_issue)
    db.flush()

    # Critical check
    cr = review_code(review_type="critical_check", **llm_params)
    if cr:
        db_review.has_critical_issue = cr.get("has_critical_issue", False)
        db_review.critical_issue_type = cr.get("issue_type")
        db_review.critical_issue_description = cr.get("description")
        db_review.critical_issue_suggestion = cr.get("suggestion")

    # Merge per-issue fixes if overall improvement wasn't obtained
    if not db_review.improved_code and fixed_snippets:
        merged = list(code_lines)
        for line_no, snippet in sorted(fixed_snippets.items()):
            snippet_lines = snippet.split("\n")
            idx = line_no - 1
            if 0 <= idx < len(merged):
                for offset, sl in enumerate(snippet_lines):
                    target = idx + offset
                    if target < len(merged):
                        merged[target] = sl
                    else:
                        merged.append(sl)
        merged_code = "\n".join(merged)
        if merged_code.strip() != review_data.code_content.strip():
            db_review.improved_code = merged_code

    # Error correction
    if review_data.error_message:
        er = review_code(review_type="correct", error_message=review_data.error_message, **llm_params)
        if er:
            db_review.corrected_code = er.get("corrected_code", "")
            db_review.corrected_explanation = er.get("explanation", "")

    db.commit()
    db.refresh(db_review)
    return db_review


def get_user_reviews(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(Review).filter(
        Review.user_id == user_id
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()


def get_review_detail(db: Session, review_id: int, user_id: int):
    return db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == user_id,
    ).first()
