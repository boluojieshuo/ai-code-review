from database import engine, Base
from models import User, Review, ReviewIssue

print("正在创建数据表...")

# 创建所有表
Base.metadata.create_all(bind=engine)

print("数据表创建成功！")
print("创建了三张表：")
print("  - users（用户表）")
print("  - reviews（评审记录表）")
print("  - review_issues（评审问题表）")