import { el, loadJSON, fmt, fmtM, pct1, showTip, hideTip, initTheme, initTables, initNav } from "./common.js";

/* ================= POPULATION ================= */
function renderPopulation(population) {
  const svg = document.getElementById("pop-chart");
  svg.innerHTML = "";
  const W = 900, H = 380, ML = 54, MR = 16, MT = 20, MB = 34;
  const PW = W - ML - MR, PH = H - MT - MB;
  const yMax = 38000000;
  const x = (i) => ML + (i / (population.length - 1)) * PW;
  const y = (v) => MT + PH * (1 - v / yMax);

  [0, 10e6, 20e6, 30e6].forEach((v) => {
    const gy = y(v);
    svg.appendChild(el("line", { x1: ML, x2: W - MR, y1: gy, y2: gy, class: "gridline" }));
    const t = el("text", { x: ML - 10, y: gy + 4, class: "axis-label", "text-anchor": "end" });
    t.textContent = v === 0 ? "0" : v / 1e6 + "M";
    svg.appendChild(t);
  });

  let dA = `M ${x(0)} ${y(0)} `;
  population.forEach((d, i) => (dA += `L ${x(i)} ${y(d.saudi)} `));
  dA += `L ${x(population.length - 1)} ${y(0)} Z`;
  svg.appendChild(el("path", { d: dA, fill: "var(--saudi)", "fill-opacity": "0.85" }));

  let dB = `M ${x(0)} ${y(population[0].saudi)} `;
  population.forEach((d, i) => (dB += `L ${x(i)} ${y(d.total)} `));
  for (let i = population.length - 1; i >= 0; i--) dB += `L ${x(i)} ${y(population[i].saudi)} `;
  dB += "Z";
  svg.appendChild(el("path", { d: dB, fill: "var(--nonsaudi)", "fill-opacity": "0.85" }));

  population.forEach((d, i) => {
    if (i % 2 !== 0) return;
    const t = el("text", { x: x(i), y: H - 10, class: "axis-label", "text-anchor": "middle" });
    t.textContent = d.year;
    svg.appendChild(t);
  });

  const crosshair = el("line", { x1: 0, x2: 0, y1: MT, y2: H - MB, class: "gridline", "stroke-dasharray": "3,3", opacity: 0 });
  svg.appendChild(crosshair);

  population.forEach((d, i) => {
    const hit = el("rect", { x: x(i) - PW / (population.length - 1) / 2, y: MT, width: PW / (population.length - 1), height: PH, class: "hit hoverable" });
    hit.addEventListener("mousemove", (evt) => {
      crosshair.setAttribute("x1", x(i)); crosshair.setAttribute("x2", x(i)); crosshair.setAttribute("opacity", 1);
      showTip(evt, `<div class="t-title">${d.year}</div>
        <div class="t-row"><span><span class="t-swatch" style="background:var(--saudi)"></span>Saudi</span><span>${fmtM(d.saudi)}</span></div>
        <div class="t-row"><span><span class="t-swatch" style="background:var(--nonsaudi)"></span>Non-Saudi</span><span>${fmtM(d.nonSaudi)}</span></div>
        <div class="t-row"><span>Total</span><span>${fmtM(d.total)}</span></div>
        <div class="t-row"><span>Non-Saudi share</span><span>${pct1((100 * d.nonSaudi) / d.total)}</span></div>`);
    });
    hit.addEventListener("mouseleave", () => { crosshair.setAttribute("opacity", 0); hideTip(); });
    svg.appendChild(hit);
  });

  document.getElementById("pop-table-body").innerHTML = population
    .map((d) => `<tr><td>${d.year}</td><td>${fmt(d.saudi)}</td><td>${fmt(d.nonSaudi)}</td><td>${fmt(d.total)}</td><td>${pct1((100 * d.nonSaudi) / d.total)}</td></tr>`)
    .join("");
}

/* ================= GDP ================= */
function renderGDP(gdp) {
  const svg = document.getElementById("gdp-chart");
  svg.innerHTML = "";
  const W = 900, H = 340, ML = 44, MR = 16, MT = 20, MB = 34;
  const PW = W - ML - MR, PH = H - MT - MB;
  const gMax = 13, gMin = -6;
  const x = (i) => ML + (i / gdp.length) * PW + (PW / gdp.length) / 2;
  const bw = (PW / gdp.length) * 0.62;
  const yZero = MT + (PH * gMax) / (gMax - gMin);
  const yVal = (v) => MT + (PH * (gMax - v)) / (gMax - gMin);

  [12, 8, 4, 0, -4].forEach((v) => {
    const gy = yVal(v);
    svg.appendChild(el("line", { x1: ML, x2: W - MR, y1: gy, y2: gy, class: v === 0 ? "zero-line" : "gridline" }));
    const t = el("text", { x: ML - 8, y: gy + 4, class: "axis-label", "text-anchor": "end" });
    t.textContent = v + "%";
    svg.appendChild(t);
  });

  gdp.forEach((d, i) => {
    const barY = d.growth >= 0 ? yVal(d.growth) : yZero;
    const barH = Math.abs(yVal(d.growth) - yZero);
    const rect = el("rect", {
      x: x(i) - bw / 2, y: barY, width: bw, height: Math.max(barH, 1.5),
      fill: d.growth >= 0 ? "var(--pos)" : "var(--neg)",
      opacity: d.prelim ? 0.55 : 0.92, rx: 2, class: "hoverable",
    });
    rect.addEventListener("mousemove", (evt) => {
      showTip(evt, `<div class="t-title">${d.year}${d.prelim ? " (prelim.)" : ""}</div>
        <div class="t-row"><span>Real GDP growth</span><span>${d.growth > 0 ? "+" : ""}${d.growth.toFixed(2)}%</span></div>`);
    });
    rect.addEventListener("mouseleave", hideTip);
    svg.appendChild(rect);

    if (i % 2 === 0 || i === gdp.length - 1) {
      const t = el("text", { x: x(i), y: H - 10, class: "axis-label", "text-anchor": "middle" });
      t.textContent = "'" + String(d.year).slice(2);
      svg.appendChild(t);
    }
  });

  [2011, 2020, 2022, 2025].forEach((year) => {
    const i = gdp.findIndex((dd) => dd.year === year);
    if (i < 0) return;
    const d = gdp[i];
    const labelY = d.growth >= 0 ? yVal(d.growth) - 8 : yVal(d.growth) + 16;
    const t = el("text", { x: x(i), y: labelY, "text-anchor": "middle", class: "axis-label", fill: d.growth >= 0 ? "var(--pos)" : "var(--neg)", "font-weight": "700" });
    t.textContent = (d.growth > 0 ? "+" : "") + d.growth.toFixed(1) + "%";
    svg.appendChild(t);
  });

  document.getElementById("gdp-table-body").innerHTML = gdp
    .map((d) => `<tr><td>${d.year}${d.prelim ? " *" : ""}</td><td>${d.growth > 0 ? "+" : ""}${d.growth.toFixed(2)}%</td></tr>`)
    .join("");
}

/* ================= CITIES ================= */
function renderCities(cities) {
  const max = 7200000;
  const wrap = document.getElementById("city-rows");
  const sorted = cities.slice().sort((a, b) => b.y2022 - a.y2022);
  wrap.innerHTML = sorted
    .map((c) => {
      const cagr = (Math.pow(c.y2022 / c.y2010, 1 / 12) - 1) * 100;
      const p1 = ((c.y2010 / max) * 100).toFixed(2);
      const p2 = ((c.y2022 / max) * 100).toFixed(2);
      const lo = Math.min(p1, p2), hi = Math.max(p1, p2);
      const cls = cagr >= 0 ? "good" : "crit";
      return `<div class="city-row">
        <div class="city-name">${c.name}</div>
        <div class="city-track">
          <div class="base"></div>
          <div class="conn" style="left:${lo}%; width:${hi - lo}%;"></div>
          <div class="dot start" style="left:${p1}%;" title="2010: ${fmt(c.y2010)}"></div>
          <div class="dot end" style="left:${p2}%;" title="2022: ${fmt(c.y2022)}"></div>
        </div>
        <div class="city-figs">${fmtM(c.y2010)} → ${fmtM(c.y2022)} &nbsp; <span class="cagr ${cls}">${cagr >= 0 ? "+" : ""}${cagr.toFixed(2)}%/yr</span></div>
      </div>`;
    })
    .join("");
}

/* ================= REGIONS ================= */
function renderRegions(regions) {
  const sorted = regions.slice().sort((a, b) => b.saudi + b.nonSaudi - (a.saudi + a.nonSaudi));
  const max = Math.max(...sorted.map((r) => r.saudi + r.nonSaudi));
  const wrap = document.getElementById("region-rows");
  wrap.innerHTML = sorted
    .map((r) => {
      const total = r.saudi + r.nonSaudi;
      const widthPct = ((total / max) * 100).toFixed(2);
      const saudiPct = ((r.saudi / total) * 100).toFixed(2);
      const nonPct = (100 - saudiPct).toFixed(2);
      const nonShare = ((r.nonSaudi / total) * 100).toFixed(1);
      return `<div class="region-row">
        <div class="region-name">${r.name}</div>
        <div class="region-bar" style="width:${widthPct}%;">
          <div class="seg-saudi" style="width:${saudiPct}%;" title="Saudi: ${fmt(r.saudi)}"></div>
          <div class="seg-nonsaudi" style="width:${nonPct}%;" title="Non-Saudi: ${fmt(r.nonSaudi)}"></div>
        </div>
        <div class="region-share">${nonShare}% non-Saudi</div>
      </div>`;
    })
    .join("");
}

/* ================= FAITH ================= */
function renderFaith(faith) {
  const colors = ["var(--saudi)", "var(--nonsaudi)", "var(--accent)", "var(--ink-3)", "var(--ink-3)", "var(--border)"];
  const bar = document.getElementById("faith-bar");
  const leg = document.getElementById("faith-legend");
  bar.innerHTML = faith.map((f, i) => `<div style="width:${f.pct}%; background:${colors[i % colors.length]};" title="${f.label}: ${f.pct}%"></div>`).join("");
  leg.innerHTML = faith.map((f, i) => `<span class="item"><span class="swatch" style="background:${colors[i % colors.length]}"></span>${f.label} (${f.pct}%)</span>`).join("");
}

async function init() {
  initTheme();
  initTables();
  initNav();

  const [population, cities, regions, gdp, faith] = await Promise.all([
    loadJSON("data/population.json"),
    loadJSON("data/cities.json"),
    loadJSON("data/regions.json"),
    loadJSON("data/gdp.json"),
    loadJSON("data/faith.json"),
  ]);

  renderPopulation(population);
  renderGDP(gdp);
  renderCities(cities);
  renderRegions(regions);
  renderFaith(faith);

  window.addEventListener("resize", () => {
    renderPopulation(population);
    renderGDP(gdp);
  });
}

init().catch((err) => {
  console.error(err);
  document.querySelector(".wrap").insertAdjacentHTML(
    "afterbegin",
    `<div class="card" style="margin-top:16px;"><b>Could not load historical data.</b> Open the browser console for details.</div>`
  );
});
