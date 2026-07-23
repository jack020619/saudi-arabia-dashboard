// Shared utilities used by every page: nav highlighting, theme toggle,
// tooltip, JSON loading, formatting, and generic chart building blocks.

export const svgns = "http://www.w3.org/2000/svg";
export const fmt = (n) => Math.round(n).toLocaleString("en-US");
export const fmtM = (n) => (n / 1e6).toFixed(2) + "M";
export const pct1 = (n) => n.toFixed(1) + "%";

export function el(tag, attrs) {
  const e = document.createElementNS(svgns, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

export async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

/* ---------------- Nav ---------------- */
export function initNav() {
  const here = location.pathname.split("/").filter(Boolean).pop() || "index.html";
  document.querySelectorAll(".sitenav a").forEach((a) => {
    const target = a.getAttribute("href");
    if (target === here) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
  const year = new Date().getFullYear();
  document.querySelectorAll(".this-year-label").forEach((e) => (e.textContent = year));
}

/* ---------------- Theme toggle ---------------- */
export function initTheme() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  if (stored) root.setAttribute("data-theme", stored);
  const label = () => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.getAttribute("data-theme") || (dark ? "dark" : "light");
    btn.textContent = current === "dark" ? "☾ Dark" : "☀ Light";
  };
  label();
  btn.addEventListener("click", () => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.getAttribute("data-theme") || (dark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    label();
  });
}

/* ---------------- Tooltip ---------------- */
let tip = null;
export function showTip(evt, html) {
  if (!tip) tip = document.getElementById("tooltip");
  if (!tip) return;
  tip.innerHTML = html;
  tip.classList.add("show");
  tip.style.left = evt.clientX + "px";
  tip.style.top = evt.clientY + "px";
}
export function hideTip() {
  if (!tip) tip = document.getElementById("tooltip");
  if (tip) tip.classList.remove("show");
}

/* ---------------- Table toggle ---------------- */
export function initTables() {
  document.querySelectorAll(".table-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      const willShow = !target.classList.contains("show");
      target.classList.toggle("show");
      btn.textContent = btn.textContent.replace(/[▾▴]/, willShow ? "▴" : "▾");
    });
  });
}

/* ---------------- Sparkline (small multiples in stat cards) ---------------- */
export function sparkline(values) {
  const W = 240, H = 40, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const x = (i) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const y = (v) => pad + (H - pad * 2) * (1 - (v - min) / range);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
  let d = `M ${x(0)} ${y(values[0])} `;
  values.forEach((v, i) => { if (i > 0) d += `L ${x(i)} ${y(v)} `; });
  svg.appendChild(el("path", { d, fill: "none", stroke: "var(--accent)", "stroke-width": 1.6 }));
  const dArea = d + `L ${x(values.length - 1)} ${H} L ${x(0)} ${H} Z`;
  svg.appendChild(el("path", { d: dArea, fill: "var(--accent)", "fill-opacity": "0.12" }));
  svg.appendChild(el("circle", { cx: x(values.length - 1), cy: y(values[values.length - 1]), r: 2.6, fill: "var(--accent)" }));
  return svg;
}

/**
 * Generic single-series time-line chart with gridlines, a hover
 * crosshair + tooltip, and an emphasized endpoint. Used by the "This
 * Year" page for each daily indicator. Falls back to a plain message
 * when there aren't enough points yet to draw a line.
 *
 * points: [{date: "2026-07-23", value: 101.71}, ...], ascending by date.
 */
export function renderTimeSeries(svgId, points, opts) {
  const svg = document.getElementById(svgId);
  svg.innerHTML = "";
  const { color = "var(--accent)", unit = "", valueFormatter = (v) => v.toFixed(2) } = opts || {};

  if (!points || points.length < 2) {
    const W = 900, H = 220;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const t = el("text", { x: W / 2, y: H / 2, "text-anchor": "middle", class: "axis-label" });
    t.textContent = points && points.length === 1
      ? `Tracking started ${points[0].date} — a line appears once a second day lands.`
      : "No data yet.";
    svg.appendChild(t);
    return;
  }

  const W = 900, H = 260, ML = 56, MR = 16, MT = 20, MB = 34;
  const PW = W - ML - MR, PH = H - MT - MB;
  const values = points.map((p) => p.value);
  const vMin = Math.min(...values), vMax = Math.max(...values);
  const pad = (vMax - vMin) * 0.12 || Math.abs(vMax) * 0.05 || 1;
  const yMin = vMin - pad, yMax = vMax + pad;

  const x = (i) => ML + (i / (points.length - 1)) * PW;
  const y = (v) => MT + PH * (1 - (v - yMin) / (yMax - yMin));

  const gridSteps = 4;
  for (let s = 0; s <= gridSteps; s++) {
    const v = yMin + ((yMax - yMin) * s) / gridSteps;
    const gy = y(v);
    svg.appendChild(el("line", { x1: ML, x2: W - MR, y1: gy, y2: gy, class: "gridline" }));
    const t = el("text", { x: ML - 10, y: gy + 4, class: "axis-label", "text-anchor": "end" });
    t.textContent = valueFormatter(v);
    svg.appendChild(t);
  }

  let d = `M ${x(0)} ${y(points[0].value)} `;
  points.forEach((p, i) => { if (i > 0) d += `L ${x(i)} ${y(p.value)} `; });
  svg.appendChild(el("path", { d, fill: "none", stroke: color, "stroke-width": 2 }));

  const dArea = d + `L ${x(points.length - 1)} ${H - MB} L ${x(0)} ${H - MB} Z`;
  svg.appendChild(el("path", { d: dArea, fill: color, "fill-opacity": "0.10" }));

  // x labels: first, last, and a few in between
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  points.forEach((p, i) => {
    if (i % labelEvery !== 0 && i !== points.length - 1) return;
    const t = el("text", { x: x(i), y: H - 10, class: "axis-label", "text-anchor": "middle" });
    t.textContent = p.date.slice(5); // MM-DD
    svg.appendChild(t);
  });

  // emphasized endpoint
  const last = points[points.length - 1];
  svg.appendChild(el("circle", { cx: x(points.length - 1), cy: y(last.value), r: 4, fill: color }));

  const crosshair = el("line", { x1: 0, x2: 0, y1: MT, y2: H - MB, class: "gridline", "stroke-dasharray": "3,3", opacity: 0 });
  svg.appendChild(crosshair);

  points.forEach((p, i) => {
    const hitW = PW / (points.length - 1);
    const hit = el("rect", { x: x(i) - hitW / 2, y: MT, width: hitW, height: PH, class: "hit hoverable" });
    hit.addEventListener("mousemove", (evt) => {
      crosshair.setAttribute("x1", x(i)); crosshair.setAttribute("x2", x(i)); crosshair.setAttribute("opacity", 1);
      showTip(evt, `<div class="t-title">${p.date}</div>
        <div class="t-row"><span><span class="t-swatch" style="background:${color}"></span>Value</span><span>${valueFormatter(p.value)} ${unit}</span></div>`);
    });
    hit.addEventListener("mouseleave", () => { crosshair.setAttribute("opacity", 0); hideTip(); });
    svg.appendChild(hit);
  });
}
