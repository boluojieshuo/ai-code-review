AI 智能代码评审助手 — 部署指南
================================

## ☁️ Render 部署（推荐，免费）

### 1. 准备工作
- 注册 https://render.com （用 GitHub 登录）
- 把项目代码推送到 GitHub 仓库

### 2. 一键部署
- 打开 Render Dashboard → New → Web Service
- 选择你的 GitHub 仓库
- Render 会自动识别根目录的 `render.yaml`
- 点击 "Create Web Service"

### 3. 设置环境变量（唯一需要的手动步骤）
在 Render Web Service → Environment 中添加：
  DASHSCOPE_API_KEY = 你的通义千问 API Key

免费 Key 获取：https://bailian.aliyun.com （新用户送 100 万 tokens）

### 4. 完成
部署完成后 Render 会给你一个 URL（如 https://ai-code-review.onrender.com），用户打开即可使用。

数据库 PostgreSQL 由 Render 自动创建，无需手动配置。

---

## 🐳 自托管 / VPS 部署

### 前置要求
- Docker 已安装
- 有 DASHSCOPE_API_KEY

### 步骤

  # 1. 构建镜像
  docker build -t code-review .

  # 2. 运行（使用 SQLite，简单但数据不持久）
  docker run -p 8000:8000 -e DASHSCOPE_API_KEY=你的Key code-review

  # 3. 运行（使用外部 PostgreSQL）
  docker run -p 8000:8000 \
    -e DASHSCOPE_API_KEY=你的Key \
    -e DATABASE_URL=postgresql://user:pass@host:5432/dbname \
    code-review

### 访问
  浏览器打开 http://你的服务器IP:8000

---

## 🖥️ 本地开发

  cd backend
  pip install -r requirements.txt
  cp .env.example .env   # 编辑填入 API Key
  uvicorn main:app --reload

  cd frontend
  npm install && npm run dev

  前端：http://localhost:5173
  后端：http://localhost:8000
