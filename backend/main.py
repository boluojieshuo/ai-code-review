import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import auth, review

app = FastAPI(title="AI Code Review", version="2.0")

# Auto-create tables on startup
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# API routes
app.include_router(auth.router)
app.include_router(review.router)


@app.get("/api")
def api_root():
    return {"message": "AI Code Review API", "version": "2.0"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve React SPA — must be last
frontend_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

