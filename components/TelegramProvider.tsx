"use client";

import Script from "next/script";

export default function TelegramProvider() {
  // Loaded with `afterInteractive` (not `beforeInteractive`): that strategy
  // injects the <script> via the DOM API, so React never renders a script node
  // — which is what triggered the "script tag while rendering" warning. The SDK
  // sets --tg-viewport-* vars on <html>; the root layout's suppressHydrationWarning
  // already covers the resulting attribute mismatch. onReady runs after load and
  // on every remount, so the WebApp is initialised as soon as it's available.
  function init() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onReady={init}
    />
  );
}
