"""ResumeRadar scoring engine: plain rules, no AI model."""
import re
from collections import Counter

SKILLS = [
    r"python", r"java", r"javascript|js", r"typescript", r"c\+\+", r"c#", r"golang",
    r"sql|mysql|postgresql", r"mongodb", r"html", r"css", r"react", r"angular", r"vue",
    r"node\.?js", r"django", r"flask", r"fastapi", r"spring", r"streamlit",
    r"machine learning|ml", r"deep learning", r"artificial intelligence", r"nlp|natural language",
    r"computer vision", r"tensorflow", r"pytorch", r"pandas", r"numpy", r"scikit-learn|sklearn",
    r"data analysis", r"data science", r"data structures", r"algorithms", r"statistics",
    r"power ?bi", r"tableau", r"excel", r"aws", r"azure", r"gcp|google cloud", r"docker",
    r"kubernetes", r"git|github", r"ci/cd", r"linux", r"rest api|restful|apis?", r"microservices",
    r"agile|scrum", r"jira", r"selenium", r"testing|qa", r"automation", r"manual testing",
    r"unit test", r"junit|pytest", r"postman", r"cypress", r"playwright", r"test cases",
    r"bug tracking", r"performance testing", r"problem solving", r"communication", r"teamwork",
    r"leadership", r"project management", r"debugging", r"cybersecurity", r"iot", r"android", r"figma",
]
STOP = set("""a about above after all also an and any are as at be been being but by can could do does for
from had has have he her his how i if in into is it its may more most must no not of on one or our out over own
per should so some such than that the their them then there these they this those to too under up us use used
using very was we were what when where which while who will with would you your work working experience years
year team role job candidate required requirements responsibilities skills strong good ability well new etc
including looking join company position apply plus preferred knowledge understanding""".split())
ACTION_VERBS = ["built", "developed", "designed", "implemented", "created", "led", "managed", "improved",
                "optimized", "automated", "analyzed", "launched", "delivered", "reduced", "increased",
                "tested", "deployed", "collaborated", "engineered", "maintained", "achieved", "trained", "integrated"]
SECTIONS = {"Summary": r"summary|objective|profile", "Education": r"education",
            "Experience": r"experience|internship|employment", "Projects": r"projects?",
            "Skills": r"skills", "Certifications": r"certif|courses|achievements"}


def _term(t):
    return re.compile(rf"(^|[^a-z0-9+#])({t})($|[^a-z0-9+#])", re.I)


_SKILL_RE = [(s, _term(s)) for s in SKILLS]


def _label(s):
    return s.split("|")[0].replace("\\", "").replace("?", "")


def _pct(x):
    return int(x + 0.5)


def analyze(resume: str, job_description: str) -> dict:
    r, j = resume.lower(), job_description.lower()
    terms = [(_label(s), rx, 2) for s, rx in _SKILL_RE if rx.search(j)]
    words = [w.strip(".-") for w in re.findall(r"[a-z][a-z+#.\-]{2,}", j)]
    counts = Counter(w for w in words if len(w) > 2 and w not in STOP
                     and not any(rx.search(w) for _, rx in _SKILL_RE))
    for w, c in [x for x in counts.most_common() if x[1] >= 2][:12]:
        terms.append((w, _term(re.escape(w)), 1))

    matched, missing, got, total = [], [], 0, 0
    for name, rx, weight in terms:
        total += weight
        if rx.search(r):
            matched.append(name)
            got += weight
        else:
            missing.append(name)
    keyword = _pct(got / total * 100) if total else 0

    found = [k for k, pat in SECTIONS.items() if re.search(pat, r)]
    sections = _pct(len(found) / len(SECTIONS) * 100)

    n_words = len(r.split())
    nums = len(re.findall(r"\d+\s?(?:%|\+|x\b|k\b|users|hours|ms|tests|bugs)", r))
    verbs = sum(1 for v in ACTION_VERBS if re.search(rf"\b{v}\b", r))
    checks = [
        (bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", r)), "Email address found", "Add a professional email address"),
        (bool(re.search(r"\+?\d[\d\s().-]{8,}\d", r)), "Phone number found", "Add a phone number"),
        ("linkedin.com" in r, "LinkedIn profile linked", "Add your LinkedIn URL"),
        (bool(re.search(r"github\.com|portfolio|behance|gitlab", r)), "GitHub / portfolio linked",
         "Link your GitHub or portfolio so recruiters can see your work"),
        (250 <= n_words <= 900, f"Length looks right ({n_words} words)",
         f"Resume is short ({n_words} words). Add detail on projects and results" if n_words < 250
         else f"Resume is long ({n_words} words). Trim to 1-2 pages"),
        (nums >= 3, "Uses measurable results", "Quantify impact (e.g. reduced bugs by 30%, tested 120+ cases)"),
        (verbs >= 5, "Strong action verbs used", "Start bullets with verbs like built, automated, optimized, led"),
        (not re.search(r"\b(i am|i have|my name)\b", r), "No first-person phrasing",
         "Remove 'I am / I have'; write in short bullet style"),
    ]
    quality = _pct(sum(c[0] for c in checks) / len(checks) * 100)
    score = _pct(keyword * 0.6 + sections * 0.15 + quality * 0.25)

    suggestions = []
    if missing:
        suggestions.append("Work these keywords in where you truly have the skill: " + ", ".join(missing[:8]) + ".")
    suggestions += [f"Add a clear '{k}' section." for k in SECTIONS if k not in found]
    suggestions += [c[2] + "." for c in checks if not c[0]]
    suggestions.append("Tailor a copy of your resume for each job: mirror the exact wording the job description uses.")

    return {"score": score, "keyword": keyword, "sections": sections, "quality": quality,
            "matched": matched, "missing": missing,
            "checks": [{"ok": ok, "text": msg if ok else fix} for ok, msg, fix in checks],
            "suggestions": suggestions}
