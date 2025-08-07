// victimEthnicity.js – Victim ethnicity vs. population bar chart
import { cleanDefRow } from './cleanData.js'; // re‑use helpers for basic trims (optional)

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const DATA_FOLDER = './data/';

const POPULATION = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const LABELS = Object.keys(POPULATION);

const ETHNICITY_COLORS = {
  'Hispanic or Latino': '#e91e63',
  'White': '#ff9800',
  'Black or African American': '#ffe600',
  'Asian': '#4caf50',
  'American Indian and Alaska Native': '#00bcd4',
  'Native Hawaiian and Other Pacific Islander': '#9c27b0'
};

const VICT_COLOR = '#007acc';   // blue
const POP_COLOR  = '#ff9800';   // orange

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
async function findLatestYear (prefix) {
  const current = new Date().getFullYear();
  for (let y = current; y >= 2015; y--) {
    const res = await fetch(`${DATA_FOLDER}${prefix}_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  throw new Error(`No file found for prefix ${prefix}`);
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

// treat row as business if gender blank and victim age is N/A/blank
function isBusiness (row) {
  const gender = String(row['Gender'] || '').trim();
  const ageRaw = String(row['Victim age'] || '').trim().toUpperCase();
  return !gender && (ageRaw === 'N/A' || ageRaw === 'NA' || !ageRaw);
}

// ---------------------------------------------------------------------------
// DATA LOAD + CHART
// ---------------------------------------------------------------------------
async function loadData () {
  try {
    const year = await findLatestYear('victim_demographics');

    const buf   = await fetch(`${DATA_FOLDER}victim_demographics_${year}.xlsx`).then(r => r.arrayBuffer());
    const wb    = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const counts = {};
    let total = 0;

    rows.forEach(r => {
      if (isBusiness(r)) return; // skip businesses
      const eth = normalEthnicity(r['Ethnicity']);
      if (!eth) return;
      counts[eth] = (counts[eth] || 0) + 1;
      total++;
    });

    const popTotal = Object.values(POPULATION).reduce((a, b) => a + b, 0);

    const victData = LABELS.map(k => ((counts[k] || 0) / (total || 1)) * 100);
    const popData  = LABELS.map(k => (POPULATION[k] / popTotal) * 100);

    buildChart(LABELS, victData, popData);
  } catch (err) {
    console.error(err);
  }
}

function buildChart (labels, victData, popData) {
  const ctx       = document.getElementById('victimEthChart');
  const hoverLbl  = document.getElementById('hoverVEthLabel');
  const hoverVict = document.getElementById('hoverVEthVict');
  const hoverPop  = document.getElementById('hoverVEthPop');

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Victims',     data: victData, backgroundColor: VICT_COLOR },
        { label: 'Population',  data: popData,  backgroundColor: POP_COLOR }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: v => v + '%' },
          suggestedMax: 100
        }
      },
      plugins: { legend: { position: 'top' }, tooltip: { enabled: false } },
      onHover: (evt, els, chart) => {
        const list = chart.getElementsAtEventForMode(evt, 'nearest', { axis: 'y', intersect: false }, false);
        if (list.length) {
          const i = list[0].index;
          hoverLbl.textContent  = labels[i];
          hoverVict.textContent = `${victData[i].toFixed(2)}% of victims`;
          hoverPop.textContent  = `${popData[i].toFixed(2)}% of population`;
        } else {
          hoverLbl.textContent = hoverVict.textContent = hoverPop.textContent = '';
        }
      }
    }
  });
}

// kick‑off
loadData();
