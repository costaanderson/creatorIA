from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api.routes import instagram_auth, brand_kit, content, publish

app = FastAPI(title="CreatorAI Backend", version="0.1.0")

import os
_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(instagram_auth.router)
app.include_router(brand_kit.router)
app.include_router(content.router)
app.include_router(publish.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
