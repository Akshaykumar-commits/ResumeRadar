const $=id=>document.getElementById(id);
const SK=["python","java","javascript|js","typescript","c\\+\\+","c#","golang","sql|mysql|postgresql","mongodb","html","css","react","angular","vue","node\\.?js","django","flask","spring","streamlit","machine learning|ml","deep learning","artificial intelligence","nlp|natural language","computer vision","tensorflow","pytorch","pandas","numpy","scikit-learn|sklearn","data analysis","data science","data structures","algorithms","statistics","power ?bi","tableau","excel","aws","azure","gcp|google cloud","docker","kubernetes","git|github","ci/cd","linux","rest api|restful|apis?","microservices","agile|scrum","jira","selenium","testing|qa","automation","manual testing","unit test","junit|pytest","postman","cypress","playwright","test cases","bug tracking","performance testing","problem solving","communication","teamwork","leadership","project management","debugging","cybersecurity","iot","android","figma"];
const STOP=new Set("a about above after all also an and any are as at be been being but by can could do does for from had has have he her his how i if in into is it its may more most must no not of on one or our out over own per should so some such than that the their them then there these they this those to too under up us use used using very was we were what when where which while who will with would you your work working experience years year team role job candidate required requirements responsibilities skills strong good ability well new etc including looking join company position apply plus preferred knowledge understanding".split(" "));
const ACT="built|developed|designed|implemented|created|led|managed|improved|optimized|automated|analyzed|launched|delivered|reduced|increased|tested|deployed|collaborated|engineered|maintained|achieved|trained|integrated".split("|");
const re=t=>new RegExp("(^|[^a-z0-9+#])("+t+")($|[^a-z0-9+#])","i");
const nice=t=>t.replace(/\\\+/g,"+").replace(/\\\.\?/g,".").replace(/ \?/g," ").split("|")[0].replace(/\?$/,"");
let pdfText="";

const drop=$("drop"),fi=$("file");
drop.onclick=()=>fi.click();
drop.onkeydown=e=>{if(e.key==="Enter")fi.click()};
drop.ondragover=e=>{e.preventDefault();drop.classList.add("on")};
drop.ondragleave=()=>drop.classList.remove("on");
drop.ondrop=e=>{e.preventDefault();drop.classList.remove("on");if(e.dataTransfer.files[0])load(e.dataTransfer.files[0])};
fi.onchange=()=>fi.files[0]&&load(fi.files[0]);

async function load(f){
  $("err").textContent="";$("fname").textContent="Reading "+f.name+"…";
  try{
    if(/\.txt$/i.test(f.name)){pdfText=await f.text()}
    else{
      pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const doc=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
      let t="";
      for(let i=1;i<=doc.numPages;i++){const c=await (await doc.getPage(i)).getTextContent();t+=c.items.map(x=>x.str).join(" ")+"\n"}
      pdfText=t;
    }
    if(pdfText.trim().length<50)throw new Error("empty");
    $("fname").textContent="✓ "+f.name+" ("+pdfText.split(/\s+/).length+" words)";
    $("rtxt").value="";
  }catch(e){pdfText="";$("fname").textContent="";$("err").textContent="Couldn’t read that file. Use a text-based PDF (not a scan) or paste the text."}
}

function analyze(resume,jd){
  const R=resume.toLowerCase(),J=jd.toLowerCase();
  let jdSk=SK.filter(s=>re(s).test(J));
  // extra frequent JD words not in dictionary
  const cnt={};(J.match(/[a-z][a-z+#.-]{2,}/g)||[]).forEach(w=>{if(!STOP.has(w)&&!SK.some(s=>re(s).test(w)))cnt[w]=(cnt[w]||0)+1});
  const extra=Object.entries(cnt).filter(e=>e[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,12).map(e=>e[0]);
  const terms=[...jdSk.map(s=>({n:nice(s),r:re(s),w:2})),...extra.map(w=>({n:w,r:re(w.replace(/[.+]/g,"\\$&")),w:1}))];
  const matched=[],missing=[];let got=0,tot=0;
  terms.forEach(t=>{tot+=t.w;if(t.r.test(R)){matched.push(t.n);got+=t.w}else missing.push(t.n)});
  const kw=tot?Math.round(got/tot*100):0;
  // sections
  const secs={Summary:/(summary|objective|profile)/,Education:/education/,Experience:/(experience|internship|employment)/,Projects:/projects?/,Skills:/skills/,Certifications:/(certif|courses|achievements)/};
  const have=Object.keys(secs).filter(k=>secs[k].test(R));
  const sec=Math.round(have.length/6*100);
  // quality
  const words=R.split(/\s+/).length;
  const chk=[];const add=(ok,msg,fix)=>chk.push({ok,msg,fix});
  add(/[\w.+-]+@[\w-]+\.[\w.]+/.test(R),"Email address found","Add a professional email address");
  add(/(\+?\d[\d\s().-]{8,}\d)/.test(R),"Phone number found","Add a phone number");
  add(/linkedin\.com/.test(R),"LinkedIn profile linked","Add your LinkedIn URL");
  add(/github\.com|portfolio|behance|gitlab/.test(R),"GitHub / portfolio linked","Link your GitHub or portfolio so recruiters can see your work");
  add(words>=250&&words<=900,"Length looks right ("+words+" words)",words<250?"Resume is short ("+words+" words). Add detail on projects and results":"Resume is long ("+words+" words). Trim to 1–2 pages");
  const nums=(R.match(/\d+\s?(%|\+|x\b|k\b|users|hours|ms|tests|bugs)/g)||[]).length;
  add(nums>=3,"Uses measurable results","Quantify impact (e.g. “reduced bugs by 30%”, “tested 120+ cases”)");
  const verbs=ACT.filter(v=>new RegExp("\\b"+v+"\\b").test(R)).length;
  add(verbs>=5,"Strong action verbs used","Start bullets with verbs like built, automated, optimized, led");
  add(!/\b(i am|i have|my name)\b/.test(R),"No first-person phrasing","Remove “I am / I have”; write in short bullet style");
  const q=Math.round(chk.filter(c=>c.ok).length/chk.length*100);
  const score=Math.round(kw*.6+sec*.15+q*.25);
  const sug=[];
  if(missing.length)sug.push("Work these keywords in where you truly have the skill: "+missing.slice(0,8).join(", ")+".");
  Object.keys(secs).filter(k=>!have.includes(k)).forEach(k=>sug.push("Add a clear “"+k+"” section."));
  chk.filter(c=>!c.ok).forEach(c=>sug.push(c.fix+"."));
  sug.push("Tailor a copy of your resume for each job: mirror the exact wording the job description uses.");
  return{score,kw,sec,q,matched,missing,chk,sug,have};
}

$("go").onclick=()=>{
  const resume=pdfText||$("rtxt").value,jd=$("jd").value;
  $("err").textContent="";
  if(resume.trim().length<50||jd.trim().length<30){$("err").textContent="Please add your resume and a job description.";return}
  const a=analyze(resume,jd);
  const col=a.score>=70?"var(--ok)":a.score>=45?"var(--warn)":"var(--bad)";
  $("ring").style.background="conic-gradient("+col+" "+a.score*3.6+"deg,var(--bd) 0)";
  $("score").textContent=a.score+"%";
  $("verdict").textContent=a.score>=70?"Strong match":a.score>=45?"Decent match, room to improve":"Needs work for this role";
  $("bars").replaceChildren();
  [["Keyword match",a.kw],["Resume sections",a.sec],["ATS & quality",a.q]].forEach(([l,v])=>{
    const d=document.createElement("div");d.innerHTML='<div class="lbl"><span></span><b></b></div><div class="bar"><i></i></div>';
    d.querySelector("span").textContent=l;d.querySelector("b").textContent=v+"%";d.querySelector("i").style.width=v+"%";$("bars").append(d)});
  const chips=(el,arr,c)=>{el.replaceChildren();if(!arr.length){el.textContent="None";return}arr.forEach(t=>{const s=document.createElement("span");s.className="chip "+c;s.textContent=t;el.append(s)})};
  chips($("m"),a.matched,"ok");chips($("x"),a.missing,"bad");
  const li=(el,items)=>{el.replaceChildren();items.forEach(t=>{const l=document.createElement("li");l.textContent=t;el.append(l)})};
  li($("chk"),a.chk.map(c=>(c.ok?"✅ ":"⚠️ ")+(c.ok?c.msg:c.fix)));
  li($("sug"),a.sug);
  window._rep="Resume match: "+a.score+"%\nMatched: "+a.matched.join(", ")+"\nMissing: "+a.missing.join(", ")+"\n\nSuggestions:\n- "+a.sug.join("\n- ");
  $("out").hidden=false;$("out").scrollIntoView({behavior:"smooth"});
};
$("cp").onclick=async()=>{try{await navigator.clipboard.writeText(window._rep);$("cp").textContent="Copied ✓"}catch(e){$("cp").textContent="Copy not allowed here"}};
