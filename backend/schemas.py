from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


# ===== 用户相关 =====

# 用户注册请求
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


# 用户登录请求
class UserLogin(BaseModel):
    username: str
    password: str


# 用户信息响应
class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


# 登录返回的 token
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ===== 评审问题相关 =====

class ReviewIssueBase(BaseModel):
    line_number: Optional[int] = None
    severity: str        # 严重程度：critical, major, minor, info
    category: str        # 类别：bug, style, performance, security
    description: str     # 问题描述
    suggestion: str      # 修改建议
    improved_code_snippet: Optional[str] = None # 针对此问题的改进代码片段


class ReviewIssueResponse(ReviewIssueBase):
    id: int

    class Config:
        from_attributes = True


# ===== 评审相关 =====

# 提交评审请求
class ReviewCreate(BaseModel):
    code_content: str
    language: str
    file_name: Optional[str] = "untitled"
    review_type: str = "general" # Add review type
    specific_issues: Optional[str] = None # For improve type
    error_message: Optional[str] = None # For correct type


# 评审详情响应（含问题列表）
class ReviewResponse(BaseModel):
    id: int
    file_name: str
    language: str
    overall_score: Optional[float] = None
    summary: Optional[str] = None
    status: str
    created_at: datetime
    issues: List[ReviewIssueResponse] = []
    review_type: str
    improved_code: Optional[str] = None
    corrected_code: Optional[str] = None
    corrected_explanation: Optional[str] = None
    has_critical_issue: Optional[bool] = None
    critical_issue_type: Optional[str] = None
    critical_issue_description: Optional[str] = None
    critical_issue_suggestion: Optional[str] = None

    class Config:
        from_attributes = True


# ===== 代码改进相关 =====
class ImprovedCodeResponse(BaseModel):
    improved_code: str
    summary: str

    class Config:
        from_attributes = True


# ===== 代码纠错相关 =====
class CorrectedCodeResponse(BaseModel):
    corrected_code: str
    explanation: str

    class Config:
        from_attributes = True


# ===== 严重问题检查相关 =====
class CriticalIssueCheckResponse(BaseModel):
    has_critical_issue: bool
    issue_type: Optional[str] = None
    description: Optional[str] = None
    suggestion: Optional[str] = None
    improved_code: Optional[str] = None

    class Config:
        from_attributes = True


# 评审列表响应（不含问题详情，列表页用）
class ReviewListResponse(BaseModel):
    id: int
    file_name: str
    language: str
    overall_score: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True