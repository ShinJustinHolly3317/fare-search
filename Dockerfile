# 建置階段：編譯 Next.js standalone
FROM node:22-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 執行階段：Node + Playwright Chromium + 虛擬螢幕
FROM node:22-bookworm AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PLAYWRIGHT_HEADLESS=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends xvfb x11-utils \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY docker/start.sh ./start.sh

# standalone 不一定帶齊 Playwright CLI；再裝一次 production deps + 瀏覽器
RUN npm ci --omit=dev \
  && npx playwright install --with-deps chromium \
  && chmod +x start.sh \
  && mkdir -p .cache .playwright-profile

EXPOSE 3000

CMD ["./start.sh"]
