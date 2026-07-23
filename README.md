# Saudi Arabia, 2010–Present: Population & Economy

A free, self-updating website tracking Saudi Arabia's population, cities, faith
composition and economic development from 2010 to today.

**Live site:** https://jack020619.github.io/saudi-arabia-dashboard/
(GitHub Pages, source: `master` branch, `/docs` folder.)

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

USD/SAR is deliberately *not* live-tracked: it's a hard SAMA peg (~3.75 since
1986), and the free FX feed for that pair is thin/illiquid enough to show
implausible multi-percent daily "swings" that are quote noise, not real
moves. The site shows it as a static fact instead.

Source: Yahoo Finance's public (unofficial but widely used) chart endpoint —
**no API key, no account, no credit card, free forever.** The workflow uses
Node.js (built-in `fetch`, zero npm dependencies) and only GitHub's own
`GITHUB_TOKEN` (provided automatically) to commit back to the repo — public
repos get generous free Actions minutes, so a once-a-day, few-second job
costs nothing.

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
scripts/fetch-daily.mjs      ← the daily fetch job (Node, zero dependencies)
scripts/serve.mjs            ← local static server, for previewing docs/ here
.github/workflows/update-daily.yml  ← the free daily cron
package.json                 ← npm scripts (see below)
```

Everything runs on Node's standard library (`fetch`, `fs/promises`, `http`) —
`npm install` has nothing to install, so there's no dependency tree to break
or go stale.

## Running it locally

```
npm run fetch:daily   # fetch today's indicators into docs/data/
npm run serve         # preview the site at http://localhost:8080/
```

`fetch:daily` updates `docs/data/daily.json` and appends to
`docs/data/daily-history.json`. `serve` needs nothing else running — it's a
zero-dependency static file server over `docs/`, purely for local preview;
the deployed site is still served by GitHub Pages, not this server.

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
