AI 代码评审助手 — 使用指南
==============================

## ☁️ 在线使用（推荐）

直接打开网站即可使用，无需安装任何东西：

  https://你的域名.com

功能：粘贴/拖入代码 → AI 评审 → 查看结果和改进建议

## 🖥️ 本地开发

  前置要求：Python 3.10+ 和 Node.js 18+

  # 后端
  cd backend
  pip install -r requirements.txt
  cp .env.example .env   # 编辑填入 DASHSCOPE_API_KEY
  uvicorn main:app --reload

  # 前端
  cd frontend
  npm install && npm run dev

  前端：http://localhost:5173
  后端：http://localhost:8000
