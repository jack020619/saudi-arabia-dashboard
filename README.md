# Saudi Arabia, 2010–Present: Population & Economy

A free, self-updating website tracking Saudi Arabia's population, cities, faith
composition and economic development from 2010 to today.

**Live site:** enable GitHub Pages for this repo (Settings → Pages → source:
`main` branch, `/docs` folder) and it will be served at
`https://<your-username>.github.io/<repo-name>/`.

## What updates automatically, and what doesn't

Saudi Arabia's official statistics agency (GASTAT) publishes population once a
year (mid-year estimates) and GDP quarterly/annually — there is no legitimate
daily figure for either, and this project does not invent one.

What genuinely changes daily are market indicators tightly linked to the Saudi
economy, so a scheduled job (`.github/workflows/update-daily.yml`) runs once a
day, fetches them, and commits the result:

- Brent crude oil (`BZ=F`)
- WTI crude oil (`CL=F`)
- Tadawul All Share Index (`^TASI.SR`)
- USD/SAR exchange rate (`SAR=X`)

Source: Yahoo Finance's public (unofficial but widely used) chart endpoint —
**no API key, no account, no credit card, free forever.** The workflow uses
only GitHub's own `GITHUB_TOKEN` (provided automatically) to commit back to
the repo, and public repos get generous free Actions minutes — a once-a-day,
few-second job costs nothing.

Population, city, region, faith and GDP-history figures are updated manually,
by editing the JSON files in `docs/data/`, whenever GASTAT/World Bank publish
a new release (at most a few times a year).

## Project layout

```
docs/                       ← GitHub Pages root
  index.html                ← the page
  assets/style.css          ← design tokens + layout (light & dark)
  assets/app.js             ← fetches the JSON below and draws every chart
  data/
    population.json         ← 2010–2024 annual population by nationality
    cities.json              ← 2010 & 2022 census, top 10 cities
    regions.json              ← 2022 census, all 13 administrative regions
    gdp.json                  ← 2010–2025 annual real GDP growth
    faith.json                 ← estimated religious composition
    daily.json                  ← latest daily-indicator snapshot (auto)
    daily-history.json           ← append-only daily log (auto, capped ~10y)
scripts/fetch_daily.py       ← the daily fetch job (stdlib-only Python)
.github/workflows/update-daily.yml  ← the free daily cron
```

## Running the fetch script locally

```
python scripts/fetch_daily.py
```

Updates `docs/data/daily.json` and appends to `docs/data/daily-history.json`.
No dependencies beyond the Python standard library.

## Updating the historical data

Edit the relevant file in `docs/data/` directly — it's plain JSON, one array
of objects. The site re-renders from whatever is there on next page load; no
build step.

## Caveats

- City population is only as fresh as the last census (2022); there is no
  official annual city series.
- Regional breakdowns run annually only through 2022, since the 2022 census
  reset the series.
- Religious composition is a third-party demographic estimate, not a census
  fact — Saudi Arabia's census does not ask about religion.
- The "Today" panel is the only truly daily-resolution data on the page; the
  historical charts intentionally stay at their real annual/quarterly
  resolution rather than being interpolated into fake monthly points.
