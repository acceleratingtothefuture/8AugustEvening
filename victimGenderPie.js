// victimGenderPie.js – Victim gender pie chart

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const DATA_FOLDER = './data/';

const LABELS = ['Male', 'Female', 'Other / Unknown'];

const COLORS = {
  Male:   '#2196f3',  // blue
  Female: '#e91e63',  // pink
  'Other / Unknown': '#9e9e9e' // grey
};

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

function mapGender (raw) {
  const t = String(raw).toLowerCase();
  if (t.startsWith('m')) return 'Male';
  if (t.startsWith('f')) return 'Female';
  return 'Other / Unknown';
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

    const counts = { Male: 0, Female: 0, 'Other / Unknown': 0 };
    let total = 0;

    rows.forEach(r => {
      if (isBusiness(r)) return;
      const g = mapGender(r['Gender']);
      counts[g]++;
      total++;
    });

    const data = LABELS.map(l => ((counts[l] || 0) / (total || 1)) * 100);
    buildChart(LABELS, data);
  } catch (err) {
    console.error(err);
  }
}

function buildChart (labels, data) {
  const ctx   = document.getElementById('victimGenderPieChart');
  const lblEl = document.getElementById('hoverVGenderLabel');
  const pctEl = document.getElementById('hoverVGenderPct');

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(l => COLORS[l]),
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        tooltip: { enabled: false }
      },
      onHover: (evt, els, chart) => {
        if (els.length) {
          const i = els[0].index;
          const sliceColor = COLORS[labels[i]];
          lblEl.textContent = labels[i];
          pctEl.textContent = `${data[i].toFixed(2)}% of victims`;
          pctEl.style.color = sliceColor;
        } else {
          lblEl.textContent = '';
          pctEl.textContent = '';
          pctEl.style.color = '';
        }
      }
    }
  });
}

// run
loadData();
