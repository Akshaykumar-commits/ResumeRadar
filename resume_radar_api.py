"""ResumeRadar backend (FastAPI). Serves the web page and the /api endpoints."""
import io
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

from resume_radar_analyzer import analyze

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PAGES = 15
MAX_TEXT_CHARS = 30000
RATE_LIMIT, RATE_WINDOW = 30, 60  # requests per seconds, per visitor

app = FastAPI(title="ResumeRadar")
_hits = defaultdict(deque)


def _check_rate(request: Request):
    ip = (request.headers.get("x-forwarded-for") or request.client.host or "?").split(",")[0].strip()
    now, q = time.time(), _hits[ip]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(429, "Too many requests. Please wait a minute and try again.")
    q.append(now)


def _read_upload(name: str, data: bytes) -> str:
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "File is too large (max 5 MB).")
    if name.lower().endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in reader.pages[:MAX_PAGES])
        except Exception:
            raise HTTPException(422, "Couldn't read that PDF. Use a text-based PDF, not a scan.")
    if name.lower().endswith(".txt"):
        return data.decode("utf-8", errors="ignore")
    raise HTTPException(415, "Please upload a PDF or TXT file.")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_endpoint(request: Request, job_description: str = Form(...),
                           resume_text: str = Form(""), resume_file: UploadFile | None = File(None)):
    _check_rate(request)
    text = _read_upload(resume_file.filename or "", await resume_file.read()) if resume_file else resume_text
    if len(text.strip()) < 50:
        raise HTTPException(422, "Couldn't find enough text in the resume. Use a text-based PDF or paste the text.")
    if len(job_description.strip()) < 30:
        raise HTTPException(422, "Please paste a longer job description.")
    return analyze(text[:MAX_TEXT_CHARS], job_description[:MAX_TEXT_CHARS])  # nothing is stored


app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="static")
