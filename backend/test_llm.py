from llm_service import review_code

print("正在测试大模型代码评审...")
print("=" * 50)

# 测试用的代码（故意写点有问题的）
test_code = """
def calculate_average(numbers):
    total = 0
    for i in range(len(numbers)):
        total = total + numbers[i]
    avg = total / len(numbers)
    return avg

def main():
    nums = [1, 2, 3, 4, 5]
    result = calculate_average(nums)
    print("平均值是" + result)

if __name__ == "__main__":
    main()
"""

# 调用评审
result = review_code(
    code_content=test_code,
    language="Python",
    file_name="test.py"
)

if result:
    print("✅ 调用成功！")
    print("=" * 50)
    print(f"总体评分: {result['overall_score']} 分")
    print(f"总体评价: {result['summary']}")
    print("=" * 50)
    print(f"发现 {len(result['issues'])} 个问题：")
    for i, issue in enumerate(result['issues'], 1):
        print(f"\n{i}. [{issue['severity']}] {issue['category']}")
        print(f"   行号: {issue['line_number']}")
        print(f"   问题: {issue['description']}")
        print(f"   建议: {issue['suggestion']}")
else:
    print("❌ 调用失败！")
    print("请检查：")
    print("  1. API Key 是否正确")
    print("  2. 网络是否正常")
    print("  3. dashscope 包是否安装")