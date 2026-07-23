#!/usr/bin/env python3
"""
Fetch daily economic proxy indicators for the Saudi Arabia dashboard.

Sources (no API key, no account, free forever):
  - Yahoo Finance public chart endpoint (unofficial, but widely used and key-free)
    for Brent crude, WTI crude, the Tadawul All Share Index, and USD/SAR.

Writes:
  - docs/data/daily.json          latest snapshot
  - docs/data/daily-history.json  append-only daily log (capped at ~10 years)

This script is stdlib-only (urllib/json) so the GitHub Actions runner needs
no pip install step -- one less thing that can break for free.
"""
import json
import os
import urllib.request
import datetime

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaudiDashboardBot/1.0"}

INDICATORS = {
    "brent":  {"symbol": "BZ=F",     "label": "Brent Crude Oil",              "unit": "USD/bbl"},
    "wti":    {"symbol": "CL=F",     "label": "WTI Crude Oil",                "unit": "USD/bbl"},
    "tasi":   {"symbol": "%5ETASI.SR", "label": "Tadawul All Share (TASI)",   "unit": "pts"},
    "usdsar": {"symbol": "SAR=X",    "label": "USD / SAR",                   "unit": "SAR"},
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "docs", "data")
DAILY_PATH = os.path.join(DATA_DIR, "daily.json")
HISTORY_PATH = os.path.join(DATA_DIR, "daily-history.json")
HISTORY_CAP_DAYS = 3650  # ~10 years


def fetch_quote(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5d&interval=1d"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.load(resp)
    meta = payload["chart"]["result"][0]["meta"]
    price = meta.get("regularMarketPrice")
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    return price, prev


def build_snapshot():
    now = datetime.datetime.now(datetime.timezone.utc)
    snapshot = {
        "date": now.strftime("%Y-%m-%d"),
        "fetched_at_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "indicators": {},
    }
    for key, cfg in INDICATORS.items():
        try:
            price, prev = fetch_quote(cfg["symbol"])
        except Exception as exc:  # network hiccup, symbol hiccup, etc.
            print(f"WARN: could not fetch {key} ({cfg['symbol']}): {exc}")
            continue
        if price is None:
            print(f"WARN: no price returned for {key}")
            continue
        change = (price - prev) if prev else None
        change_pct = (change / prev * 100) if (change is not None and prev) else None
        snapshot["indicators"][key] = {
            "label": cfg["label"],
            "unit": cfg["unit"],
            "value": round(price, 4),
            "prev_close": round(prev, 4) if prev is not None else None,
            "change": round(change, 4) if change is not None else None,
            "change_pct": round(change_pct, 3) if change_pct is not None else None,
        }
    return snapshot


def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return default


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    snapshot = build_snapshot()

    if not snapshot["indicators"]:
        print("No indicators fetched successfully this run -- leaving existing files untouched.")
        return

    with open(DAILY_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)
        f.write("\n")

    history = load_json(HISTORY_PATH, [])
    history = [h for h in history if h.get("date") != snapshot["date"]]  # idempotent re-run same day
    history.append(snapshot)
    history.sort(key=lambda h: h["date"])
    history = history[-HISTORY_CAP_DAYS:]

    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
        f.write("\n")

    print(f"Updated {snapshot['date']}: " + ", ".join(
        f"{k}={v['value']}" for k, v in snapshot["indicators"].items()
    ))


if __name__ == "__main__":
    main()
