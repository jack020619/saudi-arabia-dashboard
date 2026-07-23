#!/usr/bin/env node
/**
 * Fetch daily economic proxy indicators for the Saudi Arabia dashboard.
 *
 * Source (no API key, no account, free forever): Yahoo Finance's public
 * chart endpoint (unofficial, but widely used and key-free) for Brent
 * crude, WTI crude, and the Tadawul All Share Index.
 *
 * Writes:
 *   docs/data/daily.json          latest snapshot
 *   docs/data/daily-history.json  append-only daily log (capped ~10 years)
 *
 * Node 18+ only, zero dependencies (uses the built-in fetch) -- nothing to
 * npm install, so nothing to break for free.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaudiDashboardBot/1.0" };

const INDICATORS = {
  brent: { symbol: "BZ=F", label: "Brent Crude Oil", unit: "USD/bbl" },
  wti: { symbol: "CL=F", label: "WTI Crude Oil", unit: "USD/bbl" },
  tasi: { symbol: "%5ETASI.SR", label: "Tadawul All Share (TASI)", unit: "pts" },
  // USD/SAR deliberately excluded: it's a hard SAMA peg (~3.75 since 1986),
  // and Yahoo's SAR=X feed is thin/illiquid enough to show implausible
  // multi-percent "swings" that are quote noise, not real currency moves --
  // showing that as a live daily change would misrepresent a fixed peg as
  // volatile. The site shows the peg as a static fact instead.
};

const DATA_DIR = path.join(__dirname, "..", "docs", "data");
const DAILY_PATH = path.join(DATA_DIR, "daily.json");
const HISTORY_PATH = path.join(DATA_DIR, "daily-history.json");
const HISTORY_CAP_DAYS = 3650; // ~10 years

async function fetchQuote(symbol) {
  // range=2d (not 5d): Yahoo's chartPreviousClose reflects "the close
  // before the first bar of the requested range," not a fixed yesterday
  // value -- a wider range silently reports a stale, multi-day-old close.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2d&interval=1d`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);
  const payload = await res.json();
  const meta = payload.chart.result[0].meta;
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
  return { price, prev };
}

function round(n, dp) {
  if (n == null) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

async function buildSnapshot() {
  const now = new Date();
  const snapshot = {
    date: now.toISOString().slice(0, 10),
    fetched_at_utc: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    indicators: {},
  };

  for (const [key, cfg] of Object.entries(INDICATORS)) {
    let price, prev;
    try {
      ({ price, prev } = await fetchQuote(cfg.symbol));
    } catch (err) {
      console.warn(`WARN: could not fetch ${key} (${cfg.symbol}): ${err.message}`);
      continue;
    }
    if (price == null) {
      console.warn(`WARN: no price returned for ${key}`);
      continue;
    }
    const change = prev ? price - prev : null;
    const changePct = change != null && prev ? (change / prev) * 100 : null;
    snapshot.indicators[key] = {
      label: cfg.label,
      unit: cfg.unit,
      value: round(price, 4),
      prev_close: prev != null ? round(prev, 4) : null,
      change: change != null ? round(change, 4) : null,
      change_pct: changePct != null ? round(changePct, 3) : null,
    };
  }

  return snapshot;
}

async function loadJSON(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const snapshot = await buildSnapshot();

  if (Object.keys(snapshot.indicators).length === 0) {
    console.log("No indicators fetched successfully this run -- leaving existing files untouched.");
    return;
  }

  await writeFile(DAILY_PATH, JSON.stringify(snapshot, null, 2) + "\n");

  let history = await loadJSON(HISTORY_PATH, []);
  history = history.filter((h) => h.date !== snapshot.date); // idempotent re-run same day
  history.push(snapshot);
  history.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  history = history.slice(-HISTORY_CAP_DAYS);

  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");

  const summary = Object.entries(snapshot.indicators)
    .map(([k, v]) => `${k}=${v.value}`)
    .join(", ");
  console.log(`Updated ${snapshot.date}: ${summary}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
