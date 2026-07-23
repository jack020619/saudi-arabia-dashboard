import { loadJSON, renderTimeSeries, initTheme, initTables, initNav, fmt } from "./common.js";

const INDICATORS = [
  { key: "brent", id: "chart-brent", label: "Brent Crude Oil", unit: "USD/bbl", color: "var(--pos)" },
  { key: "wti", id: "chart-wti", label: "WTI Crude Oil", unit: "USD/bbl", color: "var(--nonsaudi)" },
  { key: "tasi", id: "chart-tasi", label: "Tadawul All Share (TASI)", unit: "pts", color: "var(--accent)" },
];

function yearToDate(history, year) {
  return history
    .filter((h) => h.date.startsWith(String(year)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function renderSummary(key, points) {
  const el = document.getElementById(`summary-${key}`);
  if (!el) return;
  if (!points || points.length === 0) {
    el.textContent = "No data yet this year.";
    return;
  }
  if (points.length === 1) {
    el.textContent = `${points[0].value.toLocaleString("en-US", { maximumFractionDigits: 2 })} on ${points[0].date} — the only reading so far.`;
    return;
  }
  const first = points[0], last = points[points.length - 1];
  const change = last.value - first.value;
  const changePct = (change / first.value) * 100;
  const sign = changePct >= 0 ? "+" : "";
  const cls = changePct >= 0 ? "good" : "crit";
  el.innerHTML = `${first.date} → ${last.date}: <span class="cagr ${cls}">${sign}${changePct.toFixed(2)}%</span> (${first.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} → ${last.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}), across ${points.length} tracked day${points.length === 1 ? "" : "s"}.`;
}

function renderTable(key, points) {
  const body = document.getElementById(`table-${key}`);
  if (!body) return;
  body.innerHTML = points
    .slice()
    .reverse()
    .map((p) => `<tr><td>${p.date}</td><td>${p.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td></tr>`)
    .join("");
}

async function init() {
  initTheme();
  initTables();
  initNav();

  const year = new Date().getFullYear();

  let history = [];
  try {
    history = await loadJSON("data/daily-history.json");
  } catch (e) {
    console.warn(e);
  }

  const ytd = yearToDate(history, year);
  const startNote = document.getElementById("start-note");
  if (startNote) {
    startNote.textContent = ytd.length
      ? `${ytd.length} day${ytd.length === 1 ? "" : "s"} tracked so far in ${year}, starting ${ytd[0].date}.`
      : `No days tracked yet in ${year}.`;
  }

  INDICATORS.forEach((cfg) => {
    const points = ytd
      .filter((h) => h.indicators && h.indicators[cfg.key])
      .map((h) => ({ date: h.date, value: h.indicators[cfg.key].value }));
    renderTimeSeries(cfg.id, points, {
      color: cfg.color,
      unit: cfg.unit,
      valueFormatter: (v) => (cfg.unit === "pts" ? fmt(v) : v.toFixed(1)),
    });
    renderSummary(cfg.key, points);
    renderTable(cfg.key, points);
  });

  window.addEventListener("resize", () => {
    INDICATORS.forEach((cfg) => {
      const points = ytd
        .filter((h) => h.indicators && h.indicators[cfg.key])
        .map((h) => ({ date: h.date, value: h.indicators[cfg.key].value }));
      renderTimeSeries(cfg.id, points, {
        color: cfg.color,
        unit: cfg.unit,
        valueFormatter: (v) => (cfg.unit === "pts" ? fmt(v) : v.toFixed(1)),
      });
    });
  });
}

init().catch((err) => {
  console.error(err);
  document.querySelector(".wrap").insertAdjacentHTML(
    "afterbegin",
    `<div class="card" style="margin-top:16px;"><b>Could not load this year's data.</b> Open the browser console for details.</div>`
  );
});
