#!/bin/sh
set -eu

mkdir -p /app/.cache /app/.playwright-profile

# 沒有真實螢幕時用 Xvfb，讓 Chromium 走 headed（比 headless 少被 Google 擋）
if [ "${PLAYWRIGHT_HEADLESS:-0}" != "1" ]; then
  export DISPLAY="${DISPLAY:-:99}"
  if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    Xvfb "$DISPLAY" -screen 0 1400x900x24 -ac +extension RANDR >/tmp/xvfb.log 2>&1 &
    sleep 0.4
  fi
fi

exec node server.js
