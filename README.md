# Farefit PW

用 Playwright 開 Google Flights、依你的時間條件篩最便宜來回。本機只要有 Docker，不必裝 Node.js 或 Chromium。

## 用 Docker 跑（建議）

```bash
docker compose up --build
# 舊版 Docker 用：docker-compose up --build
```

瀏覽器打開 http://localhost:3000

第一次搜尋會比較慢（容器裡的 Chromium 要冷啟動）。快取與 cookie profile 存在 Docker volume，之後重跑不用重抓。

停掉：

```bash
docker compose down
```

## 本機開發

需要 Node 22+ 與 Playwright Chromium。

```bash
npm install
npx playwright install chromium
npm run dev
```

`.env.local` 可設 `PLAYWRIGHT_HEADLESS=1` 關掉視窗。Docker 預設走 Xvfb 虛擬螢幕（看起來像 headed，但不需要顯示器）。
