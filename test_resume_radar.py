from fastapi.testclient import TestClient
from resume_radar_analyzer import analyze
from resume_radar_api import app

client = TestClient(app)
RESUME = ("Akshay Kumar akshay@mail.com +91 98765 43210 linkedin.com/in/a github.com/a "
          "Summary Tester. Education B.Tech. Experience built and automated 120+ test cases with Selenium and Python, "
          "reduced bugs by 30%, improved coverage by 25%, deployed tests, tested APIs, designed suites. "
          "Projects Skills Python Selenium Postman Certifications " + "filler " * 150)
JD = "We need a QA engineer with Python, Selenium, Postman and Docker experience for automation testing."


def test_scoring_matches_and_missing():
    a = analyze(RESUME, JD)
    assert "python" in a["matched"] and "selenium" in a["matched"]
    assert "docker" in a["missing"]
    assert 0 <= a["score"] <= 100


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_analyze_text_and_txt_upload():
    r = client.post("/api/analyze", data={"job_description": JD, "resume_text": RESUME})
    assert r.status_code == 200 and r.json()["score"] > 30
    r = client.post("/api/analyze", data={"job_description": JD},
                    files={"resume_file": ("cv.txt", RESUME.encode(), "text/plain")})
    assert r.status_code == 200


def test_rejects_bad_input():
    assert client.post("/api/analyze", data={"job_description": JD, "resume_text": "short"}).status_code == 422
    r = client.post("/api/analyze", data={"job_description": JD}, files={"resume_file": ("a.exe", b"x" * 100)})
    assert r.status_code == 415
