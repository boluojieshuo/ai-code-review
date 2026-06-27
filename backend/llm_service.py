import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# 读取服务端环境变量
load_dotenv()

API_KEY = os.getenv("DASHSCOPE_API_KEY")
if not API_KEY:
    print("WARNING: DASHSCOPE_API_KEY not set — AI review will fail")

# 使用国际站端点（美国 → 新加坡，比直连国内稳定）
client = OpenAI(
    api_key=API_KEY,
    base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)

LLM_MODEL = os.getenv("LLM_MODEL", "qwen-plus")


# 代码评审的 Prompt 模板
REVIEW_PROMPT = """
评审以下代码，从代码风格、潜在Bug、性能、安全、可维护性五个维度分析。

文件：{file_name}  语言：{language}

【代码】
{code_content}

严格按JSON返回：
{{
  "overall_score": 0-100整数,
  "summary": "总体评价，100字以内",
  "issues": [
    {{
      "line_number": 行号数字或null,
      "severity": "critical|major|minor|info",
      "category": "bug|style|performance|security|maintainability",
      "description": "问题描述",
      "suggestion": "具体修改建议"
    }}
  ]
}}
"""

IMPROVE_PROMPT = """修复以下代码中的全部问题，输出完整的修复后代码。

文件：{file_name}  语言：{language}

【原始代码】
{code_content}

【要修复的问题】
{specific_issues}

JSON：{{"improved_code": "修复后的完整代码", "summary": "修复简述"}}"""

CORRECT_ERROR_PROMPT = """
根据错误信息修复以下代码。

文件：{file_name}  语言：{language}

【代码】
{code_content}

【错误信息】
{error_message}

严格按JSON返回：
{{
  "corrected_code": "修复后的完整代码",
  "explanation": "错误原因和修复说明，100字以内"
}}
"""

CRITICAL_ISSUE_PROMPT = """
检查以下代码是否存在死循环、栈溢出或严重性能问题。

文件：{file_name}  语言：{language}

【代码】
{code_content}

严格按JSON返回：
{{
  "has_critical_issue": true或false,
  "issue_type": "dead_loop|stack_overflow|resource_exhaustion|other",
  "description": "问题描述",
  "suggestion": "改进建议",
  "improved_code": "修复后的完整代码（如有问题）"
}}
"""

IMPROVE_ISSUE_PROMPT = """修改以下代码片段中的问题。

文件：{file_name} 语言：{language}
【代码】{code_snippet}
【问题】{issue_description}
【改法】{issue_suggestion}

JSON返回：{{"improved_code_snippet": "修改后的完整代码片段，必须体现修改"}}"""


def review_code(code_content: str, language: str, file_name: str = "untitled", review_type: str = "general", specific_issues: str = None, error_message: str = None, code_snippet: str = None, issue_description: str = None, issue_suggestion: str = None):
    """
    调用大模型进行代码评审、改进、纠错或安全检查
    返回：字典格式的评审结果、改进代码或纠错代码
    """
    prompt = ""
    if review_type == "general":
        prompt = REVIEW_PROMPT.format(
            file_name=file_name,
            language=language,
            code_content=code_content
        )
    elif review_type == "improve":
        prompt = IMPROVE_PROMPT.format(
            file_name=file_name,
            language=language,
            code_content=code_content,
            specific_issues=specific_issues if specific_issues else "（评审未发现具体问题，但仍请从命名、注释、结构方面优化代码）"
        )
    elif review_type == "correct":
        prompt = CORRECT_ERROR_PROMPT.format(
            file_name=file_name,
            language=language,
            code_content=code_content,
            error_message=error_message if error_message else "无具体错误信息，请推理代码意图进行纠错。"
        )
    elif review_type == "critical_check":
        prompt = CRITICAL_ISSUE_PROMPT.format(
            file_name=file_name,
            language=language,
            code_content=code_content
        )
    elif review_type == "improve_issue":
        prompt = IMPROVE_ISSUE_PROMPT.format(
            file_name=file_name,
            language=language,
            code_snippet=code_snippet,
            issue_description=issue_description,
            issue_suggestion=issue_suggestion if issue_suggestion else "请修复上述问题",
        )
    else:
        raise ValueError(f"Unknown review_type: {review_type}")

    # 调用通义千问 API（OpenAI 兼容接口，国际站）
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.choices[0].message.content

        if not result_text:
            print("API 返回空内容 — 请检查 DASHSCOPE_API_KEY 是否正确")
            return None

        # 去掉可能的 markdown 代码块标记
        result_text = result_text.strip()
        import re
        m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', result_text, re.DOTALL)
        if m:
            result_text = m.group(1).strip()
        else:
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
        result_text = result_text.strip()

        # 解析成 JSON
        result = json.loads(result_text)
        return result

    except Exception as e:
        print("调用大模型出错:", e)
        return None