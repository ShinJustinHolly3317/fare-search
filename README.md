# Farefit PW

A local flight sieve. Playwright opens Google Flights, then ranks the cheapest round-trip economy itineraries that actually fit your date windows and times.

Docker is enough. You do not need Node or Chromium on the host.

## Run with Docker

```bash
docker compose up --build
# older Docker: docker-compose up --build
```

Open http://localhost:3000

The first search is slow because Chromium inside the container is cold. Scrape cache and the cookie profile live on Docker volumes, so repeats are cheap.

Stop:

```bash
docker compose down
```

## Local development

Needs Node 22+ and Playwright Chromium.

```bash
npm install
npx playwright install chromium
npm run dev
```

Set `PLAYWRIGHT_HEADLESS=1` in `.env.local` to hide the browser window. Docker uses Xvfb, so it still looks headed without a real display.

```bash
npm test
```

## What it searches

- Round-trip, economy only
- Origin is one IATA. Destination can be an airport, a city (`Tokyo` → HND + NRT), or a country (capped at 8 large airports)
- Date windows × destination airports = search jobs, capped at 25
- Date picker marks Taiwan national holidays and makeup days (DGPA 2026–2027)
- UI is English / 繁中
