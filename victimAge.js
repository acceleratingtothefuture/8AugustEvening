// victimAge.js – Victim age vs. population bar chart
// File: victimAge.js

const DATA_FOLDER = './data/';
const PREFIX = window.VICTIM_DEM_PREFIX || 'victim_demographics'; // victim_demographics2023.xlsx

const LABELS = ['20–29', '30–39', '40–49', '50–59', '60+'];
const POPULATION = {
  '20–29': 26169,
  '30–39': 25065,
  '40–49': 20257,
  '50–59': 19196,
  '60+':   35773
};

const VICT_COLOR = '#007acc';
const POP_COLOR  = '#ff9800';

const panel = document.getElementById('panelVictimAge');

async function findLatestYear() {
  const cur = new Date().getFullYear();
  for (let y = cur; y >= 2015; y--) {
    const res = await fetch(`${DATA_FOLDER}${PREFIX}${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  return null;
}

function mapAgeGroup(age) {
  if (!Number.isFinite(age)) return null;
  if (age >= 20 && age <= 29) return '20–29';
  if (age <= 39)             return '30–39';
  if (age <= 49)             return '40–49';
  if (age <= 59)             return '50–59';
  if (age >= 60)             return '60+';
  return null; // ignore <20
}

function isBusiness(r) {
  const g = String(r['Gender'] || '').trim();
  const ar = String(r['Victim age'] || '').trim().toUpperCase();
  return !g && (ar === 'N/A' || ar === 'NA' || !ar);
}

async function loadData() {
  const year = await findLatestYear();
  if (!year) { panel.style.display = 'none'; return; }

  const buf = await fetch(`${DATA_FOLDER}${PREFIX}${year}.xlsx`).then(r => r.arrayBuffer());
  const wb  = XLSX.read(buf, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  const counts = {}; let total = 0;
  rows.forEach(r => {
    if (isBusiness(r)) return;
    const ageNum = parseInt(String(r['Victim age']).trim(), 10);
    const g = mapAgeGroup(ageNum);
    if (!g) return;
    counts[g] = (counts[g] || 0) + 1;
    total++;
  });

  if (!total) { panel.style.display = 'none'; return; }

  const popTotal = Object.values(POPULATION).reduce((a,b)=>a+b,0);
  const vData = LABELS.map(k => ((counts[k]||0)/total)*100);
  const pData = LABELS.map(k => (POPULATION[k]/popTotal)*100);
  buildChart(LABELS, vData, pData);
}

function buildChart(labels, vData, pData) {
  const ctx = document.getElementById('victimAgeChart');
  const lbl = document.getElementById('hoverVAgeLabel');
  const v   = document.getElementById('hoverVAgeVict');
  const p   = document.getElementById('hoverVAgePop');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets:[
        { label:'Victims',    data:vData, backgroundColor:VICT_COLOR },
        { label:'Population', data:pData, backgroundColor:POP_COLOR }
      ]
    },
    options:{
      indexAxis:'y',
      responsive:true,
      scales:{ x:{ beginAtZero:true, ticks:{ callback:v=>v+'%' } } },
      plugins:{ legend:{ position:'top' }, tooltip:{ enabled:false } },
      onHover:(e,els,ch)=>{
        const list=ch.getElementsAtEventForMode(e,'nearest',{axis:'y',intersect:false},false);
        if(list.length){
          const i=list[0].index;
          lbl.textContent = labels[i];
          v.textContent   = `${vData[i].toFixed(2)}% of victims`;
          p.textContent   = `${pData[i].toFixed(2)}% of population`;
        } else {
          lbl.textContent = v.textContent = p.textContent = '';
        }
      }
    }
  });
}

loadData();
