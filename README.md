# 📡 ResumeRadar

Full-stack resume checker. Upload a resume (PDF/TXT) or paste text, add a job description, and get a match score, matched/missing keywords, ATS checks and fixes.

- **Frontend:** HTML, CSS, JavaScript (`static/`)
- **Backend:** Python + FastAPI (`resume_radar_api.py`), PDF reading with pypdf, scoring in `resume_radar_analyzer.py`
- **Tests:** `test_resume_radar.py` (pytest)
- Resumes are processed in memory and never stored. Includes file-size limits and a per-visitor rate limit.

## Features
- Match score, matched/missing keywords, ATS checks and fixes
- 7 role presets for when you have no job description, plus a one-click example
- Progress history on the device (last 6 checks, with change since the previous one)
- Save the report as PDF (browser print), copy report

## Run locally
```
pip install -r requirements.txt
uvicorn resume_radar_api:app --reload
```
Open http://127.0.0.1:8000 · Run tests with `pytest`

## Deploy free (one public link)
**Render:** push this folder to GitHub, then on render.com choose New → Web Service, pick the repo, runtime **Docker**, instance type **Free**. You get `https://resume-radar-xxxx.onrender.com`. The free tier sleeps when idle, so the first visit after a break can take about a minute.

**Hugging Face Spaces (alternative):** create a Space with SDK **Docker**, upload these files, and add this to the top of `README.md`:
```
---
title: ResumeRadar
sdk: docker
app_port: 7860
---
```
Free plans and limits change, so check each site's current terms.

## API
`POST /api/analyze` (multipart form: `job_description`, and `resume_file` or `resume_text`) returns JSON with `score`, `keyword`, `sections`, `quality`, `matched`, `missing`, `checks`, `suggestions`. `GET /api/health` returns `{"status":"ok"}`.
