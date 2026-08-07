from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.auth.router import router as auth_router
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth & RBAC Service")

# CORS setup (Taaki Frontend bina kisi block ke API hit kar sake)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# Static Folder mount karna
app.mount("/static", StaticFiles(directory="static"), name="static")

# Root URL par Frontend Load karna
@app.get("/")
def read_index():
    return FileResponse("static/index.html")