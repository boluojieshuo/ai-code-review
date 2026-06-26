from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import User
from schemas import (
    ReviewCreate, ReviewResponse, ReviewListResponse
)
from review_service import create_review, get_user_reviews, get_review_detail
from utils import decode_token

router = APIRouter(prefix="/api/reviews", tags=["代码评审"])


def get_current_user(
        authorization: Optional[str] = Header(None),
        db: Session = Depends(get_db)
):
    """获取当前登录用户"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录"
        )

    # 去掉 "Bearer " 前缀
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在"
        )
    return user


# 提交代码评审、改进、纠错或安全检查
@router.post(
    "",
    response_model=ReviewResponse # Now always returns a comprehensive ReviewResponse
)
def submit_review(
        review_data: ReviewCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """提交一段代码进行评审、改进、纠错或安全检查"""
    review = create_review(db, review_data, current_user.id)
    return ReviewResponse.from_orm(review) # Always return the comprehensive ReviewResponse

# 获取评审历史列表
@router.get("", response_model=list[ReviewListResponse])
def get_reviews(
        skip: int = 0,
        limit: int = 20,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """获取当前用户的评审历史列表"""
    reviews = get_user_reviews(db, current_user.id, skip, limit)
    return reviews


# 获取单条评审详情
@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(
        review_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """获取单条评审的详细信息（含问题列表）"""
    review = get_review_detail(db, review_id, current_user.id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="评审记录不存在"
        )
    return review