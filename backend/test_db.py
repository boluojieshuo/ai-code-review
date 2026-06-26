from database import engine
from sqlalchemy import text

print("正在尝试连接数据库...")

try:
    with engine.connect() as conn:
        # 执行一个简单的查询
        result = conn.execute(text("SELECT 1"))
        print("✅ 数据库连接成功！")
        print("查询结果:", result.scalar())
except Exception as e:
    print("❌ 数据库连接失败！")
    print("错误信息:", e)