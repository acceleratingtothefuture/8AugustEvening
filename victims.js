// victims.js – Victim‑services dashboard (unchanged)
// Reads victims_YYYY.xlsx, counts service‑record letters A–E and renders
// cards + description + services pie.

const FOLDER = './data/';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const LETTER_DESC = {
  A: 'Information and Referral',
  B: 'Personal Advocacy / Accompaniment',
  C: 'Emotional Support or Safety Services',
  D: 'Shelter / Housing Services',
  E: 'Criminal / Civil Justice System Assistance'
};
const LETTER_DETAIL = {
  A: 'Info about victim rights, justice process, and referrals.',
  B: 'Advocacy during interviews, help with public benefits, interpreter services, immigration help.',
  C: 'Crisis counseling, community response, emergency financial help, support groups.',
  D: 'Emergency shelter, relocation help, transitional housing.',
  E: 'Updates on legal events, court support, restitution help, legal guidance.'
};
const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'];
const COLORS_SEMI = COLORS.map(c => c + 'CC'); // ~80% opacity

let latestYear = null;
let victimPieChart = null;

/* -------------------------------------------------- */
/* Data helpers                                       */
/* -------------------------------------------------- */
async function discoverVictimYear() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const res = await fetch(`${FOLDER}victims_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) { latestYear = y; return y; }
  }
  throw new Error('No victim data files found');
}

async function loadVictimData(year) {
  const buf = await fetch(`${FOLDER}victims_${year}.xlsx`).then(r => r.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  return rows.map(row => {
    const id = parseInt(String(row['Case ID']).trim(), 10);
    if (!Number.isInteger(id)) return null; // skip access‑denied rows

    const count = +row['service records'] || 0;
    return {
      count,
      letters: LETTERS.filter(L => String(row[L]).trim().toLowerCase() === 'yes')
    };
  }).filter(Boolean);
}

/* -------------------------------------------------- */
/* Render dashboard                                   */
/* -------------------------------------------------- */
function renderVictimDashboard(data) {
  const total = data.reduce((sum, r) => sum + r.count, 0);
  const letterCounts = Object.fromEntries(LETTERS.map(L => [L, 0]));
  data.forEach(r => r.letters.forEach(L => letterCounts[L]++));

  document.getElementById('victimSub').innerHTML =
    `<strong>${total.toLocaleString()}</strong> service records across ` +
    `<strong>${data.length}</strong> cases (${latestYear})`;

  const statsWrap = document.getElementById('victimStatsWrap');
  statsWrap.innerHTML = '';

  LETTERS.forEach((L, i) => {
    const count   = letterCounts[L];
    const percent = ((count / data.length) * 100).toFixed(1);
    const color   = COLORS[i % COLORS.length];

    const div = document.createElement('div');
    div.className = 'victim-card';
    div.style.borderLeftColor = color;
    div.innerHTML = `
      <div class="victim-title">${LETTER_DESC[L]}</div>
      <div class="victim-value" style="color:${color}">${count} cases</div>
      <div class="percent">(${percent}% of total)</div>`;

    div.onmouseenter = () => { updateDescription(L, color); highlightSlice(i); };
    div.onmouseleave = () => { resetDescription();  resetHighlight(); };

    statsWrap.appendChild(div);
  });

  renderServicesPie(letterCounts);
}

function renderServicesPie(letterCounts) {
  const ctx = document.getElementById('victimPieChart').getContext('2d');

  const data = LETTERS.map(L => letterCounts[L]);
  const labels = LETTERS.map(L => LETTER_DESC[L]);

  if (victimPieChart) victimPieChart.destroy();

  victimPieChart = new Chart(ctx, {
    type:'pie',
    data:{ labels, datasets:[{ data, backgroundColor:COLORS_SEMI, borderColor:'#fff', borderWidth:1 }]},
    options:{
      responsive:true,
      plugins:{ legend:{ display:false }, tooltip:{ enabled:false } },
      onHover:(evt,els) => {
        if (els.length) {
          const idx = els[0].index;
          highlightSlice(idx);
          updateDescription(LETTERS[idx], COLORS[idx]);
        } else {
          resetHighlight(); resetDescription();
        }
      }
    }
  });
}

/* Pie‑hover helpers */
function highlightSlice(index) {
  victimPieChart.data.datasets[0].backgroundColor = COLORS.map((c,i)=> i===index ? c : c + '66');
  victimPieChart.update();
}
function resetHighlight() {
  victimPieChart.data.datasets[0].backgroundColor = COLORS_SEMI;
  victimPieChart.update();
}
function updateDescription(letter, color) {
  const box = document.getElementById('victimDescBox');
  box.style.opacity = 0;
  setTimeout(() => {
    box.innerHTML = `<h3 style="color:${color}">${LETTER_DESC[letter]}</h3><p>${LETTER_DETAIL[letter]}</p>`;
    box.style.opacity = 1;
  }, 150);
}
function resetDescription() {
  const box = document.getElementById('victimDescBox');
  box.style.opacity = 0;
  setTimeout(() => { box.innerHTML = '<h3>Hover a service type to see description</h3>'; box.style.opacity = 1; }, 150);
}

/* Kick‑off */
(async()=>{
  try{
    const y = await discoverVictimYear();
    const data = await loadVictimData(y);
    renderVictimDashboard(data);
  }catch(err){
    document.getElementById('victimSub').textContent = 'No data available.';
    console.error(err);
  }
})();
