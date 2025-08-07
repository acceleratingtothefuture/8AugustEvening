// victimAge.js – Victim age vs. population bar chart

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const DATA_FOLDER = './data/';

const LABELS = ['20–29', '30–39', '40–49', '50–59', '60+'];

const POPULATION = {
  '20–29': 26169,
  '30–39': 25065,
  '40–49': 20257,
  '50–59': 19196,
  '60+':   35773
};

const VICT_COLOR = '#007acc'; // blue
const POP_COLOR  = '#ff9800'; // orange

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
async function findLatestYear (prefix) {
  const yrNow = new Date().getFullYear();
  for (let y = yrNow; y >= 2015; y--) {
    const res = await fetch(`${DATA_FOLDER}${prefix}_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  throw new Error(`No ${prefix} file found`);
}

function mapAgeGroup (age) {
  if (!Number.isFinite(age)) return null;
  if (age >= 20 && age <= 29) return '20–29';
  if (age >= 30 && age <= 39) return '30–39';
  if (age >= 40 && age <= 49) return '40–49';
  if (age >= 50 && age <= 59) return '50–59';
  if (age >= 60)              return '60+';
  return null; // ignore <20
}

function isBusiness (row) {
  const gender = String(row['Gender'] || '').trim();
  const ageRaw = String(row['Victim age'] || '').trim().toUpperCase();
  return !gender && (ageRaw === 'N/A' || ageRaw === 'NA' || !ageRaw);
}

// ---------------------------------------------------------------------------
// DATA + CHART
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

      const ageNum = parseInt(String(r['Victim age']).trim(), 10);
      const g = mapAgeGroup(ageNum);
      if (!g) return;

      counts[g] = (counts[g] || 0) + 1;
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
  const ctx       = document.getElementById('victimAgeChart');
  const hoverLbl  = document.getElementById('hoverVAgeLabel');
  const hoverVict = document.getElementById('hoverVAgeVict');
  const hoverPop  = document.getElementById('hoverVAgePop');

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Victims',    data: victData, backgroundColor: VICT_COLOR },
        { label: 'Population', data: popData,  backgroundColor: POP_COLOR }
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

// run
loadData();
