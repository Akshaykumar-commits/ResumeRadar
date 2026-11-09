const $ = id => document.getElementById(id);
let file = null;
const drop = $("drop"), fi = $("file");
drop.onclick = () => fi.click();
drop.onkeydown = e => { if (e.key === "Enter") fi.click() };
drop.ondragover = e => { e.preventDefault(); drop.classList.add("on") };
drop.ondragleave = () => drop.classList.remove("on");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("on"); if (e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]) };
fi.onchange = () => fi.files[0] && pick(fi.files[0]);

function pick(f) {
  $("err").textContent = "";
  if (!/\.(pdf|txt)$/i.test(f.name)) { $("err").textContent = "Please choose a PDF or TXT file."; return }
  if (f.size > 5 * 1024 * 1024) { $("err").textContent = "File is too large (max 5 MB)."; return }
  file = f; $("rtxt").value = ""; $("fname").textContent = "✓ " + f.name;
}

$("go").onclick = async () => {
  const jd = $("jd").value, rt = $("rtxt").value;
  $("err").textContent = "";
  if ((!file && rt.trim().length < 50) || jd.trim().length < 30) { $("err").textContent = "Please add your resume and a job description."; return }
  const fd = new FormData();
  fd.append("job_description", jd);
  file ? fd.append("resume_file", file) : fd.append("resume_text", rt);
  $("go").disabled = true; $("go").textContent = "Analyzing…";
  try {
    const r = await fetch("/api/analyze", { method: "POST", body: fd });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || "Something went wrong. Please try again.") }
    render(await r.json());
  } catch (e) { $("err").textContent = e.message }
  $("go").disabled = false; $("go").textContent = "🔍 Analyze resume";
};

function render(a) {
  const col = a.score >= 70 ? "var(--ok)" : a.score >= 45 ? "var(--warn)" : "var(--bad)";
  $("ring").style.background = "conic-gradient(" + col + " " + a.score * 3.6 + "deg,var(--bd) 0)";
  $("score").textContent = a.score + "%";
  $("verdict").textContent = a.score >= 70 ? "Strong match" : a.score >= 45 ? "Decent match, room to improve" : "Needs work for this role";
  $("bars").replaceChildren();
  [["Keyword match", a.keyword], ["Resume sections", a.sections], ["ATS & quality", a.quality]].forEach(([l, v]) => {
    const d = document.createElement("div");
    d.innerHTML = '<div class="lbl"><span></span><b></b></div><div class="bar"><i></i></div>';
    d.querySelector("span").textContent = l; d.querySelector("b").textContent = v + "%"; d.querySelector("i").style.width = v + "%";
    $("bars").append(d);
  });
  const chips = (el, arr, c) => { el.replaceChildren(); if (!arr.length) { el.textContent = "None"; return } arr.forEach(t => { const s = document.createElement("span"); s.className = "chip " + c; s.textContent = t; el.append(s) }) };
  chips($("m"), a.matched, "ok"); chips($("x"), a.missing, "bad");
  const li = (el, items) => { el.replaceChildren(); items.forEach(t => { const l = document.createElement("li"); l.textContent = t; el.append(l) }) };
  li($("chk"), a.checks.map(c => (c.ok ? "✅ " : "⚠️ ") + c.text));
  li($("sug"), a.suggestions);
  window._rep = "Resume match: " + a.score + "%\nMatched: " + a.matched.join(", ") + "\nMissing: " + a.missing.join(", ") + "\n\nSuggestions:\n- " + a.suggestions.join("\n- ");
  $("out").hidden = false; $("out").scrollIntoView({ behavior: "smooth" });
}
$("cp").onclick = async () => { try { await navigator.clipboard.writeText(window._rep); $("cp").textContent = "Copied ✓" } catch (e) { $("cp").textContent = "Copy not allowed here" } };

/* ---- extras: role presets, example, history, print ---- */
(() => {
  const ROLES = {
    qa: ["Software Tester / QA Engineer", "Looking for a QA engineer with manual testing and automation testing experience. Write and run test cases, report bugs in Jira, automate with Selenium and Python, test APIs using Postman, work in an agile team with strong problem solving and communication."],
    py: ["Python Developer", "Python developer to build backend services and REST APIs using Flask or Django and FastAPI. Work with SQL databases, Git, Docker and unit testing with pytest. Good data structures, algorithms and debugging skills in an agile team."],
    web: ["Web / Frontend Developer", "Frontend developer skilled in HTML, CSS, JavaScript and React. Build responsive web pages, connect to REST APIs, use Git, and test and debug in the browser. Knowledge of TypeScript and Figma designs is a plus."],
    da: ["Data Analyst", "Data analyst with SQL, Excel, Python and pandas. Create dashboards in Power BI or Tableau, perform data analysis and statistics, clean data, and present insights with strong communication and problem solving."],
    ml: ["Machine Learning Engineer", "Machine learning engineer with Python, pandas, numpy and scikit-learn. Build and evaluate models using TensorFlow or PyTorch, work on deep learning, NLP or computer vision, and deploy with Docker and AWS."],
    java: ["Java Developer", "Java developer with Spring, REST APIs, microservices and SQL. Strong data structures, algorithms and object oriented design. Use Git, JUnit, Docker and agile practices."],
    cloud: ["Cloud / DevOps Engineer", "DevOps engineer with AWS or Azure, Docker, Kubernetes and CI/CD pipelines. Strong Linux, Git and automation with Python or bash. Monitor systems and troubleshoot problems."]
  };
  const SAMPLE = "Alex Kumar | alex@example.com | +91 98765 43210 | linkedin.com/in/alexkumar | github.com/alexkumar\nSummary: B.Tech student and software tester.\nEducation: B.Tech, Computer Science, 2027.\nExperience: Tested web apps and wrote 80+ test cases, reported bugs in Jira, built Selenium scripts in Python and automated regression tests, reduced manual testing time by 40%.\nProjects: Gesture control app, sign language translator.\nSkills: Python, Selenium, manual testing, Postman, Git, SQL.\nCertifications: IBM Python, AWS Cloud Foundations.";
  const sel = $("role");
  sel.add(new Option("Or pick a role…", ""));
  Object.entries(ROLES).forEach(([k, v]) => sel.add(new Option(v[0], k)));
  sel.onchange = () => { if (sel.value) $("jd").value = ROLES[sel.value][1] };
  $("ex").onclick = () => {
    $("rtxt").value = SAMPLE; $("jd").value = ROLES.qa[1]; sel.value = "qa";
    if (typeof file !== "undefined") file = null;
    if (typeof pdfText !== "undefined") pdfText = "";
    $("fname").textContent = "Example loaded. Press Analyze to see a report."; $("err").textContent = "";
  };
  const KEY = "rr_hist";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch (e) { return [] } };
  const save = a => { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch (e) {} };
  let hist = load();
  function draw() {
    $("hist").hidden = !hist.length; $("hl").replaceChildren();
    hist.forEach((h, i) => {
      const r = document.createElement("div"); r.className = "hrow";
      const l = document.createElement("div"), a = document.createElement("span"), d = document.createElement("small");
      a.textContent = h.l;
      d.textContent = new Date(h.t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      l.append(a, d); r.append(l);
      if (i === 0 && hist[1]) {
        const df = h.s - hist[1].s, c = document.createElement("em");
        c.className = "delta"; c.textContent = (df > 0 ? "+" : "") + df + " vs previous"; r.append(c);
      }
      const p = document.createElement("b"); p.textContent = h.s + "%";
      p.style.color = h.s >= 70 ? "var(--ok)" : h.s >= 45 ? "var(--warn)" : "var(--bad)";
      r.append(p); $("hl").append(r);
    });
  }
  new MutationObserver(() => {
    const s = parseInt($("score").textContent); if (isNaN(s)) return;
    const jd = $("jd").value.trim(), role = Object.values(ROLES).find(v => v[1] === jd);
    hist.unshift({ t: Date.now(), s, l: role ? role[0] : jd.slice(0, 42) + (jd.length > 42 ? "…" : "") });
    hist = hist.slice(0, 6); save(hist); draw();
  }).observe($("score"), { childList: true });
  $("hc").onclick = () => { hist = []; save(hist); draw() };
  $("pr").onclick = () => { try { window.print() } catch (e) {} };
  draw();
})();
