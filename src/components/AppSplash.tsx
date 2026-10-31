import { useEffect, useState } from "react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const SPLASH_SEEN_KEY = "app_splash_seen";

/**
 * Заставка при холодном старте приложения. При повторном визите скрипт в <head>
 * (см. __root.tsx) заранее прячет её через CSS, так что она не показывается ни на
 * один кадр. При самом первом запуске держим её минимум 3 секунды, затем плавно
 * скрываем. Стили заставки — в head() корневого маршрута.
 */
const AppSplash = () => {
  const [state, setState] = useState<"shown" | "hiding" | "gone">("shown");

  useEffect(() => {
    const isFirstLaunch = !safeGetItem(SPLASH_SEEN_KEY);
    const minSplashMs = isFirstLaunch ? 3000 : 0;
    const splashStart = performance.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const raf = requestAnimationFrame(() => {
      safeSetItem(SPLASH_SEEN_KEY, "1");
      if (!isFirstLaunch) {
        setState("gone");
        return;
      }
      const elapsed = performance.now() - splashStart;
      const remaining = Math.max(0, minSplashMs - elapsed);
      timers.push(
        setTimeout(() => {
          setState("hiding");
          timers.push(setTimeout(() => setState("gone"), 500));
        }, remaining),
      );
    });
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div id="app-splash" className={state === "hiding" ? "app-splash--hide" : undefined}>
      <h1 className="app-splash__title">ЗАП ОПТОМ</h1>
      <span className="app-splash__subtitle">Проверенные запчасти</span>
      <div className="app-splash__loader"></div>
    </div>
  );
};

export default AppSplash;
