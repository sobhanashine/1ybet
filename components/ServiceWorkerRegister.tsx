"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length > 0) {
            for (const registration of registrations) {
              registration.unregister();
            }
            const clearCaches = async () => {
              if (typeof caches !== "undefined") {
                const keys = await caches.keys();
                await Promise.all(keys.map((key) => caches.delete(key)));
              }
            };
            clearCaches().finally(() => {
              window.location.reload();
            });
          }
        });
      }
    } else {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* registration failures are non-fatal */
        });
      }
    }
  }, []);
  return null;
}
