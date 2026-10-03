/* ---- Config: paste your Supabase values (Project Settings > API) to go live. Leave blank for demo mode.
   The anon/publishable key is safe to commit. Never put the database password or service_role key here. ---- */
const SUPABASE_URL = "";       // e.g. "https://abcdxyz.supabase.co"
const SUPABASE_ANON_KEY = "";  // the anon / publishable key

const CATS = ["Robot arm","Mobile robot","Sensor","Controller","Electronics","Tool","3D printer","Other"];
const LIVE = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const sb = LIVE ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = () => new Date().toISOString().slice(0,10);
const uid = () => crypto.randomUUID();

/* ---- Data layer: same API for localStorage demo and Supabase ---- */
const seed = () => [
 ["RB-001","UR5e collaborative arm","Robot arm","Bench 1","Available"],
 ["RB-002","TurtleBot 4 Lite","Mobile robot","Arena","CheckedOut","Aisha K.","2026-10-09"],
 ["SN-014","Intel RealSense D435i","Sensor","Cabinet B","Available"],
 ["SN-021","RPLidar A2","Sensor","Cabinet B","Maintenance"],
 ["CT-007","Jetson Orin Nano kit","Controller","Bench 2","CheckedOut","Rahul D.","2026-09-28"],
 ["PR-003","Prusa MK4","3D printer","Print room","Available"],
 ["EL-040","Bench power supply 30V","Electronics","Bench 2","Retired"]
].map(([asset_tag,name,category,location,status,assignee,due_date])=>({id:uid(),asset_tag,name,category,location,status,assignee:assignee||null,due_date:due_date||null,notes:"",created_at:new Date().toISOString()}));

const store = {
  async load(){
    if(LIVE){
      const [a,l] = await Promise.all([
        sb.from("assets").select("*").order("asset_tag"),
        sb.from("activity").select("*").order("at",{ascending:false}).limit(12)]);
      if(a.error||l.error) throw (a.error||l.error);
      return {assets:a.data, log:l.data};
    }
    let d = JSON.parse(localStorage.getItem("rleams")||"null");
    if(!d){ d={assets:seed(),log:[]}; localStorage.setItem("rleams",JSON.stringify(d)); }
    return d;
  },
  async upsert(asset, action, who){
    if(LIVE){
      const r = await sb.from("assets").upsert(asset); if(r.error) throw r.error;
      const g = await sb.from("activity").insert({asset_id:asset.id,asset_tag:asset.asset_tag,action,person:who||null}); if(g.error) throw g.error;
      return;
    }
    const d = await this.load(); const i = d.assets.findIndex(x=>x.id===asset.id);
    i<0 ? d.assets.push(asset) : d.assets[i]=asset;
    d.log.unshift({asset_tag:asset.asset_tag,action,person:who||null,at:new Date().toISOString()});
    d.log=d.log.slice(0,12); localStorage.setItem("rleams",JSON.stringify(d));
  },
  async remove(asset){
    if(LIVE){ const r = await sb.from("assets").delete().eq("id",asset.id); if(r.error) throw r.error; return; }
    const d = await this.load(); d.assets=d.assets.filter(x=>x.id!==asset.id);
    d.log.unshift({asset_tag:asset.asset_tag,action:"deleted",at:new Date().toISOString()});
    localStorage.setItem("rleams",JSON.stringify(d));
  }
};

/* ---- State & rendering ---- */
let S = {assets:[],log:[]}, editing=null, acting=null;
const label = s => s==="CheckedOut"?"Checked out":s;

function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",2400)}

function render(){
  const A=S.assets, n=s=>A.filter(a=>a.status===s).length;
  const late=A.filter(a=>a.status==="CheckedOut"&&a.due_date&&a.due_date<today()).length;
  $("#stats").innerHTML=[["Total assets",A.length],["Available",n("Available")],["Checked out",n("CheckedOut")],["Overdue",late],["In maintenance",n("Maintenance")]]
    .map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join("");
  const q=$("#q").value.toLowerCase(), fc=$("#fc").value, fs=$("#fs").value;
  const rows=A.filter(a=>(!fc||a.category===fc)&&(!fs||a.status===fs)&&
    [a.asset_tag,a.name,a.location,a.assignee,a.category].join(" ").toLowerCase().includes(q));
  $("#rows").innerHTML = rows.length ? rows.map(a=>{
    const over=a.status==="CheckedOut"&&a.due_date&&a.due_date<today();
    const held=a.assignee?`${esc(a.assignee)}<small class="${over?"late":""}">due ${esc(a.due_date)}${over?" · overdue":""}</small>`:"";
    const act=a.status==="CheckedOut"?`<button class="sm" data-a="in" data-id="${a.id}">Check in</button>`
      :a.status==="Available"?`<button class="sm" data-a="out" data-id="${a.id}">Check out</button>`:"";
    return `<tr><td class="tag">${esc(a.asset_tag)}</td><td>${esc(a.name)}<small>${esc(a.category)}</small></td><td>${esc(a.location)}</td>
    <td><span class="st ${a.status}">${label(a.status)}</span></td><td>${held}</td>
    <td class="act">${act}<button class="sm" data-a="qr" data-id="${a.id}">QR</button><button class="sm" data-a="edit" data-id="${a.id}">Edit</button><button class="sm" data-a="del" data-id="${a.id}" aria-label="Delete ${esc(a.asset_tag)}">Delete</button></td></tr>`}).join("")
    : `<tr><td colspan="6" class="empty">No assets match. Clear the filters or add a new asset.</td></tr>`;
  $("#log").innerHTML = S.log.length ? S.log.map(l=>`<li><time>${new Date(l.at).toLocaleString([], {dateStyle:"short",timeStyle:"short"})}</time><span><b>${esc(l.asset_tag)}</b> ${esc(l.action)}${l.person?" · "+esc(l.person):""}</span></li>`).join("")
    : `<li><span>No activity yet. Check an asset in or out to see it here.</span></li>`;
}

async function refresh(){
  try{ S=await store.load(); render(); }
  catch(e){ toast("Could not load data: "+e.message); }
}
async function run(fn,msg){ try{ await fn(); await refresh(); toast(msg); }catch(e){ toast("Failed: "+e.message); } }

/* ---- Events ---- */
const fill=(sel,opts,first)=>sel.innerHTML=(first?`<option value="">${first}</option>`:"")+opts.map(o=>`<option>${o}</option>`).join("");
fill($("#fc"),CATS,"All categories"); fill($("#aCat"),CATS);
["#q","#fc","#fs"].forEach(s=>$(s).addEventListener("input",render));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());

function openAdd(tag){editing=null;$("#fA").reset();$("#aSt").disabled=false;$("#tA").textContent="Add asset";if(tag)$("#aTag").value=tag;$("#dA").showModal();}
function openOut(a){acting=a;$("#fC").reset();$("#tC").textContent="Check out "+a.asset_tag;
  const d=new Date();d.setDate(d.getDate()+7);$("#cDue").value=d.toISOString().slice(0,10);$("#dC").showModal();$("#cWho").focus();}
$("#add").onclick=()=>openAdd();
$("#fA").onsubmit=()=>{
  const prev=editing||{};
  const a={...prev,id:prev.id||uid(),asset_tag:$("#aTag").value.trim(),name:$("#aName").value.trim(),category:$("#aCat").value,
    location:$("#aLoc").value.trim(),notes:$("#aNote").value.trim(),
    status:prev.status==="CheckedOut"?"CheckedOut":$("#aSt").value,assignee:prev.assignee||null,due_date:prev.due_date||null};
  if(!prev.id) a.created_at=new Date().toISOString();
  run(()=>store.upsert(a,prev.id?"updated":"added"),"Asset saved");
};
$("#fC").onsubmit=()=>{
  const who=$("#cWho").value.trim();
  run(()=>store.upsert({...acting,status:"CheckedOut",assignee:who,due_date:$("#cDue").value},"checked out",who),"Checked out");
};
$("#rows").onclick=e=>{
  const b=e.target.closest("button"); if(!b) return;
  const a=S.assets.find(x=>x.id===b.dataset.id); if(!a) return;
  if(b.dataset.a==="edit"){editing=a;$("#tA").textContent="Edit asset";
    $("#aTag").value=a.asset_tag;$("#aName").value=a.name;$("#aCat").value=a.category;$("#aLoc").value=a.location||"";
    $("#aNote").value=a.notes||"";$("#aSt").value=a.status==="CheckedOut"?"Available":a.status;$("#aSt").disabled=a.status==="CheckedOut";$("#dA").showModal();}
  if(b.dataset.a==="out") openOut(a);
  if(b.dataset.a==="qr") showQr(a);
  if(b.dataset.a==="in") run(()=>store.upsert({...a,status:"Available",assignee:null,due_date:null},"checked in",a.assignee),"Checked in");
  if(b.dataset.a==="del" && confirm(`Delete ${a.asset_tag}? This cannot be undone.`)) run(()=>store.remove(a),"Asset deleted");
};
$("#dA").addEventListener("close",()=>$("#aSt").disabled=false);
$("#exp").onclick=()=>{
  const h=["asset_tag","name","category","location","status","assignee","due_date"];
  const csv=[h.join(",")].concat(S.assets.map(a=>h.map(k=>`"${String(a[k]??"").replace(/"/g,'""')}"`).join(","))).join("\n");
  const l=document.createElement("a");l.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));l.download="rleams-assets.csv";l.click();
};

{const m=$("#mode");
  if(LIVE){m.textContent="live · Supabase";m.classList.add("live")}
  else if(SUPABASE_URL&&SUPABASE_ANON_KEY){m.textContent="demo mode · Supabase library failed to load"}
  else m.textContent="demo mode · add keys in app.js";}
/* ---- QR: scan to add / lend / return, and print labels ---- */
// A QR may hold a bare tag ("RB-014") or a link ending in ?tag=RB-014
function tagFromCode(t){
  t=String(t).trim();
  try{const p=new URL(t).searchParams.get("tag"); if(p) return p.trim();}catch(e){}
  return t;
}
function handleTag(raw){
  const tag=tagFromCode(raw); if(!tag) return;
  const a=S.assets.find(x=>x.asset_tag.toLowerCase()===tag.toLowerCase());
  if(!a){ openAdd(tag); toast("New tag "+tag+": fill in the details"); return; }
  if(a.status==="Available") return openOut(a);
  if(a.status==="CheckedOut"){
    if(confirm(`${a.asset_tag} is held by ${a.assignee}. Check it in?`))
      run(()=>store.upsert({...a,status:"Available",assignee:null,due_date:null},"checked in",a.assignee),"Checked in");
    return;
  }
  toast(`${a.asset_tag} is ${label(a.status).toLowerCase()} and cannot be lent`);
}

let scanner=null, scanMode="lookup";
const onCode=txt=>{
  $("#dS").close();
  if(scanMode==="fill"){ $("#aTag").value=tagFromCode(txt); toast("Tag filled from QR"); } else handleTag(txt);
};
async function startScan(mode){
  scanMode=mode; $("#manTag").value=""; $("#scanMsg").textContent="Point the camera at an asset QR label.";
  $("#dS").showModal();
  if(!window.Html5Qrcode){ $("#scanMsg").textContent="Scanner library did not load. Type the tag below."; return; }
  try{
    scanner=new Html5Qrcode("reader");
    await scanner.start({facingMode:"environment"},{fps:10,qrbox:220},onCode,()=>{});
  }catch(e){
    scanner=null;
    $("#scanMsg").textContent="Camera unavailable. Allow camera access (HTTPS required) or type the tag below.";
  }
}
async function stopCam(){const s=scanner;scanner=null;if(s){try{await s.stop();s.clear()}catch(e){}}}
$("#dS").addEventListener("close",stopCam);
$("#scan").onclick=()=>startScan("lookup");
$("#aScan").onclick=()=>startScan("fill");
const manual=()=>{const v=$("#manTag").value.trim(); if(v) onCode(v);};
$("#manGo").onclick=manual;
$("#manTag").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();manual();}});

function labelUrl(tag){ return location.origin+location.pathname+"?tag="+encodeURIComponent(tag); }
function showQr(a){
  const q=qrcode(0,"M"); q.addData(labelUrl(a.asset_tag)); q.make();
  $("#qrBox").innerHTML=q.createSvgTag({cellSize:6,margin:1,scalable:true});
  $("#qrCap").textContent=a.asset_tag+" · "+a.name;
  $("#qrPrint").onclick=()=>{
    const w=window.open("","_blank"); if(!w) return toast("Allow pop-ups to print");
    w.document.write(`<title>${esc(a.asset_tag)}</title><body style="font-family:sans-serif;text-align:center;width:240px"><div style="width:200px;margin:auto">${$("#qrBox").innerHTML}</div><h2 style="margin:6px 0 0">${esc(a.asset_tag)}</h2><p style="margin:2px 0">${esc(a.name)}</p><script>onload=()=>print()<\/script>`);
    w.document.close();
  };
  $("#dQ").showModal();
}

/* ---- Admin gate: nothing loads until sign-in (Supabase Auth in live mode) ---- */
const DEMO={email:"admin@rleams.demo",password:"admin123"}; // demo mode only, not real security
let pendingTag=new URLSearchParams(location.search).get("tag"); // label link survives the login
function showApp(on,email){
  $("#login").hidden=on; $("#app").hidden=!on; $("#out").hidden=!on;
  $("#who").hidden=!on; $("#who").textContent=email||"";
  $("#demoHint").hidden=LIVE;
}
async function enter(email){
  showApp(true,email); await refresh();
  if(pendingTag){ handleTag(pendingTag); pendingTag=null; history.replaceState(null,"",location.pathname); }
}
$("#fL").onsubmit=async e=>{
  e.preventDefault(); $("#lErr").textContent="";
  const em=$("#lEmail").value.trim(), pw=$("#lPass").value;
  if(LIVE){
    const {data,error}=await sb.auth.signInWithPassword({email:em,password:pw});
    if(error) return $("#lErr").textContent=error.message;
    enter(data.user.email);
  }else if(em===DEMO.email&&pw===DEMO.password){ sessionStorage.setItem("rleams-demo","1"); enter(em); }
  else $("#lErr").textContent="Invalid email or password.";
};
$("#out").onclick=async()=>{
  if(LIVE) await sb.auth.signOut();
  sessionStorage.removeItem("rleams-demo"); location.href=location.pathname;
};
(async()=>{
  if(LIVE){ const {data}=await sb.auth.getSession(); if(data.session) return enter(data.session.user.email); }
  else if(sessionStorage.getItem("rleams-demo")) return enter(DEMO.email);
  showApp(false);
})();
