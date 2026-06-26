from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# 用户表
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联：一个用户有多个评审记录
    reviews = relationship("Review", back_populates="owner")


# 评审记录表
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String(200))      # 文件名
    language = Column(String(50))        # 编程语言
    code_content = Column(Text)          # 代码内容
    overall_score = Column(Float)        # 总体评分
    summary = Column(Text)               # 总体评价
    status = Column(String(20), default="pending")  # 状态：pending, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

    # New fields for improved/corrected code and critical issue checks
    review_type = Column(String(50), default="general") # 评审类型：general, improve, correct, critical_check
    improved_code = Column(Text, nullable=True)        # 改进后的代码
    corrected_code = Column(Text, nullable=True)       # 纠错后的代码
    corrected_explanation = Column(Text, nullable=True) # 纠错说明
    has_critical_issue = Column(Boolean, nullable=True) # 是否存在严重问题
    critical_issue_type = Column(String(50), nullable=True) # 严重问题类型
    critical_issue_description = Column(Text, nullable=True) # 严重问题描述
    critical_issue_suggestion = Column(Text, nullable=True) # 严重问题建议

    # 关联：一个评审有多个问题
    issues = relationship("ReviewIssue", back_populates="review")
    owner = relationship("User", back_populates="reviews")


# 评审问题表
class ReviewIssue(Base):
    __tablename__ = "review_issues"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"))
    line_number = Column(Integer)        # 行号
    severity = Column(String(20))        # 严重程度：critical, major, minor, info
    category = Column(String(50))        # 类别：bug, style, performance, security
    description = Column(Text)           # 问题描述
    suggestion = Column(Text)            # 修改建议
    improved_code_snippet = Column(Text, nullable=True) # 针对此问题的改进代码片段

    review = relationship("Review", back_populates="issues")