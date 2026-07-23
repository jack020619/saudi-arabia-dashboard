import { loadJSON, sparkline, initTheme, initNav } from "./common.js";

function renderToday(daily, history) {
  const grid = document.getElementById("today-grid");
  const updatedEl = document.getElementById("last-updated");

  if (!daily || !daily.indicators) {
    grid.innerHTML = `<div class="today-card"><div class="label">Live indicators</div><div class="today-empty">Daily data hasn't been fetched yet — the first automated run populates this panel.</div></div>`;
    updatedEl.textContent = "Waiting for the first daily fetch…";
    return;
  }

  updatedEl.textContent = `Live indicators as of ${daily.date} (fetched ${new Date(daily.fetched_at_utc).toUTCString().replace(":00 GMT", " GMT")})`;

  const order = ["brent", "wti", "tasi"];
  grid.innerHTML = "";
  order.forEach((key) => {
    const ind = daily.indicators[key];
    if (!ind) return;
    const card = document.createElement("div");
    card.className = "today-card";
    const changeCls = ind.change_pct == null ? "" : ind.change_pct >= 0 ? "good" : "crit";
    const changeSign = ind.change_pct == null ? "" : ind.change_pct >= 0 ? "▲" : "▼";
    card.innerHTML = `
      <div class="label">${ind.label}</div>
      <div class="value">${ind.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} <span style="font-size:13px;color:var(--ink-3);font-weight:400;">${ind.unit}</span></div>
      <div class="change ${changeCls}">${ind.change_pct == null ? "—" : `${changeSign} ${Math.abs(ind.change_pct).toFixed(2)}% vs prior close`}</div>
    `;
    const series = (history || []).map((h) => (h.indicators && h.indicators[key] ? h.indicators[key].value : null)).filter((v) => v != null);
    if (series.length >= 2) {
      card.appendChild(sparkline(series));
    } else {
      const p = document.createElement("div");
      p.className = "today-empty";
      p.textContent = "Tracking started today — a trend line appears from tomorrow's update. See the This Year page as history builds.";
      card.appendChild(p);
    }
    grid.appendChild(card);
  });
}

async function init() {
  initTheme();
  initNav();

  let daily = null, history = [];
  try { daily = await loadJSON("data/daily.json"); } catch (e) { console.warn(e); }
  try { history = await loadJSON("data/daily-history.json"); } catch (e) { console.warn(e); }

  renderToday(daily, history);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("today-grid").innerHTML = `<div class="today-card"><div class="label">Error</div><div class="today-empty">Could not load data files. Open the console for details.</div></div>`;
});
