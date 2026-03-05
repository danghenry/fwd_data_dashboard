/*!
 * Canada Economic Dashboard — dashboard.js
 * Hosted on GitHub Pages, embedded via <script> tag on Squarespace.
 * Renders into any element with id="ca-dash".
 * Usage:
 *   <div id="ca-dash"></div>
 *   <script src="https://yourusername.github.io/canada-dashboard/dashboard.js"></script>
 */
(function () {
'use strict';

// ── Detect script base URL (same pattern as app.js) ───────────────
var SCRIPT_BASE = (function () {
  var scripts = document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf('dashboard.js') > -1) {
      return scripts[i].src.replace('dashboard.js', '');
    }
  }
  return '';
})();

// CSV files are fetched from raw.githubusercontent.com.
// SCRIPT_BASE points to the GitHub Pages URL; we derive the raw URL from it.
// e.g. https://danghenery.github.io/canada-dashboard/
//   -> https://raw.githubusercontent.com/danghenery/canada-dashboard/main/data/
var BASE_URL = (function () {
  // Parse GitHub Pages URL pattern: https://{user}.github.io/{repo}/
  var m = SCRIPT_BASE.match(/https:\/\/([^.]+)\.github\.io\/([^/]+)\//);
  if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/main/data/';
  // Fallback — same directory (works for local testing with a data/ subfolder)
  return SCRIPT_BASE + 'data/';
})();

// ── Load Chart.js if not already present ──────────────────────────
function loadChartJS(cb) {
  if (typeof Chart !== 'undefined') { cb(); return; }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = cb;
  s.onerror = function () { console.error('Canada Dashboard: failed to load Chart.js'); };
  document.head.appendChild(s);
}

// ── Load fonts if not already present ─────────────────────────────
function loadFonts() {
  if (document.querySelector('link[href*="Playfair+Display"]')) return;
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap';
  document.head.appendChild(l);
}

// ── Inject scoped CSS ─────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('ca-dash-styles')) return;
  var s = document.createElement('style');
  s.id = 'ca-dash-styles';
  s.textContent = [
    // CSS custom properties scoped to the root element
    '#ca-dash{--brand:#0e64ac;--dark:#0a4a7e;--darker:#0d1f2d;--tint:#e8f1f8;--tint2:#d0e4f5;--bg:#f4f8fc;--card:#ffffff;--mu:#5a7a90;--border:#c2d6e8;--text:#0d1f2d;--pos:#1a7a4a;--neg:#c0390a;--pos-bg:#e8f5ee;--neg-bg:#fceee8;font-family:\'IBM Plex Sans\',sans-serif;color:var(--text);}',
    '#ca-dash *{box-sizing:border-box;margin:0;padding:0;}',

    // Header
    '#ca-dash .db-header{background:var(--darker);padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid var(--brand);}',
    '#ca-dash .db-title{font-family:\'Playfair Display\',serif;font-size:1.3rem;font-weight:700;color:#fff;}',
    '#ca-dash .db-subtitle{font-family:\'IBM Plex Mono\',monospace;font-size:0.62rem;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;margin-top:.2rem;}',
    '#ca-dash .db-status{font-family:\'IBM Plex Mono\',monospace;font-size:0.65rem;color:var(--mu);display:flex;align-items:center;gap:.45rem;}',
    '#ca-dash .db-dot{width:7px;height:7px;border-radius:50%;background:var(--mu);flex-shrink:0;}',
    '#ca-dash .db-dot.live{background:#4caf82;animation:ca-pulse 2s infinite;}',
    '@keyframes ca-pulse{0%,100%{opacity:1}50%{opacity:.35}}',

    // Layout
    '#ca-dash .db-main{max-width:1100px;margin:0 auto;padding:1.75rem 1.5rem;}',

    // Cards
    '#ca-dash .db-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}',
    '#ca-dash .db-card{background:var(--card);border:1.5px solid var(--border);border-radius:6px;padding:1.2rem 1.3rem;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .1s;position:relative;overflow:hidden;}',
    '#ca-dash .db-card::before{content:\'\';position:absolute;top:0;left:0;right:0;height:3px;background:var(--border);transition:background .15s;}',
    '#ca-dash .db-card:hover{border-color:var(--brand);box-shadow:0 2px 14px rgba(14,100,172,.1);transform:translateY(-1px);}',
    '#ca-dash .db-card:hover::before,#ca-dash .db-card.active::before{background:var(--brand);}',
    '#ca-dash .db-card.active{border-color:var(--brand);box-shadow:0 2px 16px rgba(14,100,172,.14);}',
    '#ca-dash .db-card-lbl{font-family:\'IBM Plex Mono\',monospace;font-size:.61rem;text-transform:uppercase;letter-spacing:.1em;color:var(--mu);margin-bottom:.55rem;}',
    '#ca-dash .db-card-val{font-family:\'Playfair Display\',serif;font-size:1.65rem;font-weight:700;color:var(--text);line-height:1.1;margin-bottom:.4rem;}',
    '#ca-dash .db-card-val.loading{color:var(--border);animation:ca-pulse 1.5s infinite;}',
    '#ca-dash .db-card-per{font-family:\'IBM Plex Mono\',monospace;font-size:.58rem;color:var(--mu);margin-bottom:.55rem;}',
    '#ca-dash .db-card-chg{display:inline-flex;align-items:center;gap:.2rem;font-family:\'IBM Plex Mono\',monospace;font-size:.68rem;padding:.15em .5em;border-radius:2px;white-space:nowrap;}',
    '#ca-dash .db-card-chg.pos{background:var(--pos-bg);color:var(--pos);}',
    '#ca-dash .db-card-chg.neg{background:var(--neg-bg);color:var(--neg);}',
    '#ca-dash .db-card-chg.neu{background:var(--tint);color:var(--mu);}',

    // Chart panel
    '#ca-dash .db-chart-panel{background:var(--card);border:1.5px solid var(--border);border-radius:6px;padding:1.5rem;}',
    '#ca-dash .db-chart-top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;}',
    '#ca-dash .db-chart-title{font-family:\'Playfair Display\',serif;font-size:1.05rem;font-weight:700;color:var(--text);}',
    '#ca-dash .db-chart-src{font-family:\'IBM Plex Mono\',monospace;font-size:.58rem;color:var(--mu);margin-top:.2rem;}',
    '#ca-dash .db-controls{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}',
    '#ca-dash .db-dr{display:flex;align-items:center;gap:.35rem;font-family:\'IBM Plex Mono\',monospace;font-size:.7rem;color:var(--mu);}',
    '#ca-dash .db-dr input[type=date]{font-family:\'IBM Plex Mono\',monospace;font-size:.7rem;padding:.32rem .55rem;border:1.5px solid var(--border);border-radius:3px;color:var(--text);background:#fff;outline:none;cursor:pointer;transition:border-color .15s;}',
    '#ca-dash .db-dr input[type=date]:focus{border-color:var(--brand);}',
    '#ca-dash .db-apply{font-family:\'IBM Plex Mono\',monospace;font-size:.68rem;padding:.35rem .9rem;background:var(--brand);color:#fff;border:none;border-radius:3px;cursor:pointer;letter-spacing:.05em;transition:background .15s;}',
    '#ca-dash .db-apply:hover{background:var(--dark);}',
    '#ca-dash .db-msg{font-family:\'IBM Plex Mono\',monospace;font-size:.72rem;padding:.6rem .9rem;border-radius:3px;margin-bottom:.75rem;display:none;}',
    '#ca-dash .db-msg.show{display:block;}',
    '#ca-dash .db-msg.loading{background:var(--tint);color:var(--mu);}',
    '#ca-dash .db-msg.error{background:#fceee8;color:#7a1a1a;}',
    '#ca-dash .db-chart-wrap{position:relative;height:290px;}',

    // Footer
    '#ca-dash .db-footer{margin-top:1.1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;}',
    '#ca-dash .db-foot-src{font-family:\'IBM Plex Mono\',monospace;font-size:.58rem;color:var(--mu);}',
    '#ca-dash .db-foot-src a{color:var(--brand);text-decoration:none;}',
    '#ca-dash .db-foot-src a:hover{text-decoration:underline;}',
    '#ca-dash .db-foot-ts{font-family:\'IBM Plex Mono\',monospace;font-size:.58rem;color:var(--mu);}',

    // Responsive
    '@media(max-width:800px){#ca-dash .db-cards{grid-template-columns:repeat(2,1fr);}}',
    '@media(max-width:480px){#ca-dash .db-cards{grid-template-columns:1fr;}#ca-dash .db-header{flex-direction:column;gap:.5rem;}}',
  ].join('');
  document.head.appendChild(s);
}

// ── Wait for root element ─────────────────────────────────────────
function waitForEl(id, attempts, cb) {
  var el = document.getElementById(id);
  if (el) { cb(el); return; }
  if (attempts <= 0) { console.error('ca-dash element not found'); return; }
  setTimeout(function () { waitForEl(id, attempts - 1, cb); }, 100);
}

// ── Kick off ──────────────────────────────────────────────────────
loadFonts();
loadChartJS(function () {
  waitForEl('ca-dash', 30, boot);
});

// ── Indicators config ─────────────────────────────────────────────
var INDICATORS = {
  population: {
    label:     'Population',
    file:      'population.csv',
    dateCol:   'year',
    valCol:    'value',
    dateType:  'year',
    fmt:       fmtPop,
    chgType:   'pct',
    chgPeriod: 'vs prior year',
    source:    'Statistics Canada, Table 17-10-0009'
  },
  gdp: {
    label:     'GDP',
    file:      'gdp.csv',
    dateCol:   'year',
    valCol:    'value_billions_cad',
    dateType:  'year',
    fmt:       fmtGDP,
    chgType:   'pct',
    chgPeriod: 'vs prior year',
    source:    'Statistics Canada, Table 36-10-0434'
  },
  inflation: {
    label:     'Inflation Rate (CPI YoY)',
    file:      'inflation.csv',
    dateCol:   'date',
    valCol:    'rate_pct',
    dateType:  'month',
    fmt:       fmtPct,
    chgType:   'pp',
    chgPeriod: 'vs prior month',
    source:    'Bank of Canada'
  },
  unemployment: {
    label:     'Unemployment Rate',
    file:      'unemployment.csv',
    dateCol:   'date',
    valCol:    'rate_pct',
    dateType:  'month',
    fmt:       fmtPct,
    chgType:   'pp',
    chgPeriod: 'vs prior month',
    source:    'Statistics Canada, Table 14-10-0287'
  }
};

// ── Formatters ────────────────────────────────────────────────────
function fmtPop(v) {
  v = parseFloat(v);
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  return Math.round(v).toLocaleString('en-CA');
}
function fmtGDP(v) {
  v = parseFloat(v);
  if (v >= 1000) return '$' + (v / 1000).toFixed(2) + 'T';
  return '$' + v.toFixed(1) + 'B';
}
function fmtPct(v) { return parseFloat(v).toFixed(1) + '%'; }

function fmtDateLabel(str, type) {
  if (type === 'year') return str;
  var d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });
}

// ── CSV parser ────────────────────────────────────────────────────
function parseCSV(text) {
  var lines = text.trim().split('\n');
  var headers = lines[0].split(',').map(function (h) { return h.trim(); });
  return lines.slice(1).map(function (line) {
    var vals = line.split(',');
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = (vals[i] || '').trim(); });
    return obj;
  }).filter(function (r) { return r[headers[0]]; });
}

// ── Fetch CSV ─────────────────────────────────────────────────────
function fetchCSV(key, cb) {
  var ind = INDICATORS[key];
  var url = BASE_URL + ind.file + '?_=' + Date.now();
  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching ' + ind.file);
      return r.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      rows.sort(function (a, b) { return a[ind.dateCol].localeCompare(b[ind.dateCol]); });
      cb(null, rows);
    })
    .catch(function (e) { cb(e.message); });
}

// ── Boot ──────────────────────────────────────────────────────────
function boot(root) {
  injectCSS();
  root.innerHTML = buildHTML();

  var cache     = {};
  var activeKey = 'population';
  var chartInst = null;
  var loaded    = 0;
  var total     = Object.keys(INDICATORS).length;
  var today     = new Date().toISOString().slice(0, 10);

  // Scope all querySelector calls to root
  var elFrom    = root.querySelector('#dr-from');
  var elTo      = root.querySelector('#dr-to');
  var elApply   = root.querySelector('#btn-apply');
  var elMsg     = root.querySelector('#chart-msg');
  var elDot     = root.querySelector('#db-dot');
  var elStatus  = root.querySelector('#db-status-txt');
  var elTs      = root.querySelector('#db-ts');

  elTo.value = today;

  // ── Messages ─────────────────────────────────────────────────
  function showMsg(type, txt) {
    elMsg.className = 'db-msg show ' + type; elMsg.textContent = txt;
  }
  function hideMsg() { elMsg.className = 'db-msg'; }

  // ── Update card ───────────────────────────────────────────────
  function updateCard(key, rows) {
    var ind  = INDICATORS[key];
    var last = rows[rows.length - 1];
    var prev = rows.length > 1 ? rows[rows.length - 2] : null;
    var v    = parseFloat(last[ind.valCol]);

    root.querySelector('#val-' + key).textContent = ind.fmt(v);
    root.querySelector('#val-' + key).classList.remove('loading');
    root.querySelector('#per-' + key).textContent =
      fmtDateLabel(last[ind.dateCol], ind.dateType) +
      (ind.dateType === 'year' ? ' (Annual)' : ' (Monthly)');

    if (prev) {
      var pv    = parseFloat(prev[ind.valCol]);
      var diff  = v - pv;
      var isPos = diff >= 0;
      var arrow = isPos ? '▲' : '▼';
      var cls   = diff === 0 ? 'neu' : (isPos ? 'pos' : 'neg');
      var chgTxt;
      if (ind.chgType === 'pct') {
        var pct = pv !== 0 ? (diff / Math.abs(pv) * 100) : 0;
        chgTxt = arrow + ' ' + (isPos ? '+' : '') + pct.toFixed(1) + '% ' + ind.chgPeriod;
      } else {
        chgTxt = arrow + ' ' + (isPos ? '+' : '') + diff.toFixed(1) + ' pp ' + ind.chgPeriod;
      }
      var el = root.querySelector('#chg-' + key);
      el.textContent = chgTxt;
      el.className = 'db-card-chg ' + cls;
    }
  }

  // ── Draw chart ─────────────────────────────────────────────────
  function drawChart(key, fromDate, toDate) {
    var rows = cache[key];
    var ind  = INDICATORS[key];
    if (!rows) return;

    var normFrom = fromDate ? fromDate.slice(0, ind.dateType === 'year' ? 4 : 10) : '';
    var normTo   = toDate   ? toDate.slice(0,   ind.dateType === 'year' ? 4 : 10) : '';

    var filtered = rows.filter(function (r) {
      var d = r[ind.dateCol].slice(0, ind.dateType === 'year' ? 4 : 10);
      return (!normFrom || d >= normFrom) && (!normTo || d <= normTo);
    });

    if (!filtered.length) {
      showMsg('error', 'No data in selected range. Try widening the dates.');
      return;
    }
    hideMsg();

    var labels = filtered.map(function (r) { return r[ind.dateCol]; });
    var values = filtered.map(function (r) { return parseFloat(r[ind.valCol]); });

    if (chartInst) { chartInst.destroy(); chartInst = null; }

    chartInst = new Chart(root.querySelector('#db-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: ind.label,
          data: values,
          borderColor: '#0e64ac',
          backgroundColor: 'rgba(14,100,172,0.06)',
          borderWidth: 2.5,
          pointRadius: filtered.length > 48 ? 0 : 3.5,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d1f2d',
            titleFont: { family: 'IBM Plex Mono', size: 11 },
            bodyFont:  { family: 'IBM Plex Sans',  size: 12 },
            callbacks: {
              title: function (items) { return fmtDateLabel(items[0].label, ind.dateType); },
              label: function (item)  { return ' ' + ind.label + ': ' + ind.fmt(item.raw); }
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#deeaf5' },
            ticks: {
              font: { family: 'IBM Plex Mono', size: 10 }, color: '#5a7a90',
              maxTicksLimit: 12,
              callback: function (val) { return fmtDateLabel(this.getLabelForValue(val), ind.dateType); }
            }
          },
          y: {
            grid: { color: '#deeaf5' },
            ticks: {
              font: { family: 'IBM Plex Mono', size: 10 }, color: '#5a7a90',
              callback: function (v) { return ind.fmt(v); }
            }
          }
        }
      }
    });

    root.querySelector('#chart-title').textContent = ind.label + ' \u2014 Historical Trend';
    root.querySelector('#chart-src').textContent   = ind.source;
  }

  // ── Card click ────────────────────────────────────────────────
  function setActive(key) {
    activeKey = key;
    root.querySelectorAll('.db-card').forEach(function (c) {
      c.classList.toggle('active', c.dataset.key === key);
    });
    if (cache[key]) {
      drawChart(key, elFrom.value, elTo.value);
    } else {
      showMsg('loading', 'Loading ' + INDICATORS[key].label + ' data\u2026');
    }
  }

  root.querySelectorAll('.db-card').forEach(function (c) {
    c.addEventListener('click', function () { setActive(c.dataset.key); });
  });

  // ── Date range apply ──────────────────────────────────────────
  elApply.addEventListener('click', function () {
    var from = elFrom.value, to = elTo.value;
    if (!from || !to || from > to) { showMsg('error', 'Please enter a valid date range.'); return; }
    if (cache[activeKey]) drawChart(activeKey, from, to);
  });

  // ── Load all CSVs ─────────────────────────────────────────────
  function onOneLoaded() {
    loaded++;
    if (loaded === total) {
      elDot.classList.add('live');
      var now = new Date();
      elStatus.textContent = 'Updated ' + now.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
      elTs.textContent = 'Data loaded: ' + now.toLocaleString('en-CA');
    }
  }

  showMsg('loading', 'Loading data\u2026');

  Object.keys(INDICATORS).forEach(function (key) {
    fetchCSV(key, function (err, rows) {
      if (err) {
        root.querySelector('#val-' + key).textContent = 'Error';
        root.querySelector('#val-' + key).classList.remove('loading');
        root.querySelector('#chg-' + key).textContent = err;
        root.querySelector('#chg-' + key).className = 'db-card-chg neg';
        onOneLoaded(); return;
      }
      cache[key] = rows;
      updateCard(key, rows);
      if (key === activeKey) drawChart(key, elFrom.value, today);
      onOneLoaded();
    });
  });
}

// ── Build HTML ────────────────────────────────────────────────────
function buildHTML() {
  return '<div class="db-header">'
    + '<div>'
    + '<div class="db-title">Canada Economic Dashboard</div>'
    + '<div class="db-subtitle">Key Indicators &mdash; Updated from CSV Data</div>'
    + '</div>'
    + '<div class="db-status"><div class="db-dot" id="db-dot"></div><span id="db-status-txt">Loading\u2026</span></div>'
    + '</div>'
    + '<div class="db-main">'
    + '<div class="db-cards">'
    + card('population', 'Population',              true)
    + card('gdp',        'GDP',                     false)
    + card('inflation',  'Inflation Rate (CPI YoY)',false)
    + card('unemployment','Unemployment Rate',      false)
    + '</div>'
    + '<div class="db-chart-panel">'
    + '<div class="db-chart-top">'
    + '<div><div class="db-chart-title" id="chart-title">Population \u2014 Historical Trend</div>'
    + '<div class="db-chart-src" id="chart-src">Statistics Canada</div></div>'
    + '<div class="db-controls">'
    + '<div class="db-dr"><span>From</span><input type="date" id="dr-from" value="2010-01-01"><span>To</span><input type="date" id="dr-to"></div>'
    + '<button class="db-apply" id="btn-apply">Apply</button>'
    + '</div></div>'
    + '<div class="db-msg" id="chart-msg"></div>'
    + '<div class="db-chart-wrap"><canvas id="db-chart"></canvas></div>'
    + '</div>'
    + '<div class="db-footer">'
    + '<div class="db-foot-src">Sources: <a href="https://www150.statcan.gc.ca" target="_blank">Statistics Canada</a> &middot; <a href="https://www.bankofcanada.ca" target="_blank">Bank of Canada</a></div>'
    + '<div class="db-foot-ts" id="db-ts"></div>'
    + '</div>'
    + '</div>';
}

function card(key, label, active) {
  return '<div class="db-card' + (active ? ' active' : '') + '" data-key="' + key + '">'
    + '<div class="db-card-lbl">' + label + '</div>'
    + '<div class="db-card-val loading" id="val-' + key + '">\u2014</div>'
    + '<div class="db-card-per" id="per-' + key + '"></div>'
    + '<span class="db-card-chg neu" id="chg-' + key + '">\u2026</span>'
    + '</div>';
}

})();
