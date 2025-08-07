// victimEthnicity.js  (DEMOGRAPHICS)
// Updated: filter out rows where Victim age is N/A / blank **OR** Gender is blank

const DATA_FOLDER = './data/';
const PREFIX = window.VICTIM_DEM_PREFIX || 'victim_demographics';

const POPULATION = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const LABELS = Object.keys(POPULATION);
const VICT_COLOR = '#007acc';
const POP_COLOR  = '#ff9800';

const panel = document.getElementById('panelVictimEthnicity');

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */
async function findLatestYear () {
  const cur = new Date().getFullYear();
  for (let y = cur; y >= 2015; y--) {
    const res = await fetch(`${DATA_FOLDER}${PREFIX}${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  return null;
}

function normalEthnicity (raw) {
  const eth = String(raw).toLowerCase();
  if (eth.includes('white'))                     return 'White';
  if (eth.includes('black'))                     return 'Black or African American';
  if (eth.includes('asian'))                     return 'Asian';
  if (eth.includes('hispanic') || eth.includes('latino'))
                                               return 'Hispanic or Latino';
  if (eth.includes('american indian') || eth.includes('alaska'))
                                               return 'American Indian and Alaska Native';
  if (eth.includes('hawaiian') || eth.includes('pacific'))
                                               return 'Native Hawaiian and Other Pacific Islander';
  return null;
}

function isBusiness (row) {
  const ageRaw = String(row['Victim age'] || '').trim().toUpperCase();
  const genderRaw = String(row['Gender'] || '').trim();
  const ageIsNA = !ageRaw || ageRaw === 'N/A' || ageRaw === 'NA';
  const genderBlank = !genderRaw;
  return ageIsNA || genderBlank;
}

/* -------------------------------------------------- */
/* main                                              */
/* -------------------------------------------------- */
async function loadData () {
  const year = await findLatestYear();
  if (!year) { panel.style.display = 'none'; return; }

  const buf   = await fetch(`${DATA_FOLDER}${PREFIX}${year}.xlsx`).then(r => r.arrayBuffer());
  const wb    = XLSX.read(buf, { type: 'array' });
  const rows  = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  const counts = {}; let total = 0;
  rows.forEach(r => {
    if (isBusiness(r)) return;
    const eth = normalEthnicity(r['Ethnicity']);
    if (!eth) return;
    counts[eth] = (counts[eth] || 0) + 1;
    total++;
  });

  if (!total) { panel.style.display = 'none'; return; }

  const popTotal = Object.values(POPULATION).reduce((a,b)=>a+b,0);
  const victData = LABELS.map(k => ((counts[k]||0)/total)*100);
  const popData  = LABELS.map(k => (POPULATION[k]/popTotal)*100);
  renderChart(LABELS, victData, popData);
}

function renderChart(labels, vict, pop) {
  const ctx   = document.getElementById('victimEthChart');
  const lOut  = document.getElementById('hoverVEthLabel');
  const vOut  = document.getElementById('hoverVEthVict');
  const pOut  = document.getElementById('hoverVEthPop');

  new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Victims',    data:vict, backgroundColor:VICT_COLOR },
      { label:'Population', data:pop,  backgroundColor:POP_COLOR }
    ]},
    options:{
      indexAxis:'y',
      responsive:true,
      scales:{ x:{ beginAtZero:true, ticks:{ callback:v=>v+'%' } } },
      plugins:{ legend:{ position:'top' }, tooltip:{ enabled:false } },
      onHover:(e,els,ch)=>{
        const hit = ch.getElementsAtEventForMode(e,'nearest',{axis:'y',intersect:false},false);
        if (hit.length) {
          const i = hit[0].index;
          lOut.textContent = labels[i];
          vOut.textContent = `${vict[i].toFixed(2)}% of victims`;
          pOut.textContent = `${pop[i].toFixed(2)}% of population`;
        } else {
          lOut.textContent = vOut.textContent = pOut.textContent = '';
        }
      }
    }
  });
}

loadData();
