// victimGenderPie.js – Victim gender pie chart (revamped)
// Filters out rows where Victim age is N/A / blank OR Gender is blank.
// Also caps chart width so it doesn’t crowd the layout.

const DATA_FOLDER = './data/';
const PREFIX = window.VICTIM_DEM_PREFIX || 'victim_demographics';

const LABELS = ['Male', 'Female', 'Other / Unknown'];
const COLORS = { Male:'#2196f3', Female:'#e91e63', 'Other / Unknown':'#9e9e9e' };

const panel = document.getElementById('panelVictimGenderPie');

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */
async function findLatestYear(){
  const cur=new Date().getFullYear();
  for(let y=cur;y>=2015;y--){
    const res=await fetch(`${DATA_FOLDER}${PREFIX}${y}.xlsx`,{method:'HEAD'});
    if(res.ok) return y;
  }
  return null;
}
function mapGender(raw){const t=String(raw).toLowerCase();if(t.startsWith('m'))return 'Male';if(t.startsWith('f'))return 'Female';return 'Other / Unknown';}
function isBusiness(r){
  const g=String(r['Gender']||'').trim();
  const a=String(r['Victim age']||'').trim().toUpperCase();
  const ageNA=!a||a==='N/A'||a==='NA';
  return ageNA||!g;
}

/* -------------------------------------------------- */
/* main                                               */
/* -------------------------------------------------- */
async function loadData(){
  const year=await findLatestYear();
  if(!year){panel.style.display='none';return;}

  const buf=await fetch(`${DATA_FOLDER}${PREFIX}${year}.xlsx`).then(r=>r.arrayBuffer());
  const wb=XLSX.read(buf,{type:'array'});
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});

  const counts={Male:0,Female:0,'Other / Unknown':0}; let total=0;
  rows.forEach(r=>{ if(isBusiness(r))return; const g=mapGender(r['Gender']); counts[g]++; total++; });

  if(!total){panel.style.display='none';return;}

  const data=LABELS.map(l=>counts[l]/total*100);
  renderChart(LABELS,data);
}

function renderChart(labels,data){
  const ctx=document.getElementById('victimGenderPieChart');
  // cap width (prevents oversized pie)
  ctx.canvas.parentElement.style.maxWidth='480px';

  const lEl=document.getElementById('hoverVGenderLabel');
  const pEl=document.getElementById('hoverVGenderPct');

  new Chart(ctx,{type:'pie',data:{labels,datasets:[{data,backgroundColor:labels.map(l=>COLORS[l]),borderColor:'#fff',borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'},tooltip:{enabled:false}},onHover:(e,els)=>{if(els.length){const i=els[0].index;lEl.textContent=labels[i];pEl.textContent=`${data[i].toFixed(2)}% of victims`;pEl.style.color=COLORS[labels[i]];}else{lEl.textContent='';pEl.textContent='';pEl.style.color='';}}}});
}

loadData();
