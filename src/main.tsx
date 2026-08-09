import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { safeGetItem, safeSetItem } from '@/lib/storage';

createRoot(document.getElementById("root")!).render(<App />);

// Прячем HTML/CSS-заставку (index.html) сразу после того, как React смонтировал
// приложение. requestAnimationFrame ждёт первый реальный кадр отрисовки, чтобы
// заставка не исчезла на мгновение раньше, чем контент готов показаться под ней.
// При самом первом запуске (сайта или установленного приложения) заставку держим
// минимум 3 секунды, даже если всё уже загрузилось быстрее — дальше, при повторных
// заходах, прячем сразу как готово, без искусственной задержки.
const SPLASH_SEEN_KEY = 'app_splash_seen';
const isFirstLaunch = !safeGetItem(SPLASH_SEEN_KEY);
const minSplashMs = isFirstLaunch ? 3000 : 0;
const splashStart = performance.now();

requestAnimationFrame(() => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  safeSetItem(SPLASH_SEEN_KEY, '1');
  // При повторном визите index.html уже отрисовал заставку скрытой (display:none) —
  // тут просто убираем узел из DOM без анимации и задержек, показывать было нечего
  if (!isFirstLaunch) {
    splash.remove();
    return;
  }
  const elapsed = performance.now() - splashStart;
  const remaining = Math.max(0, minSplashMs - elapsed);
  setTimeout(() => {
    splash.classList.add('app-splash--hide');
    setTimeout(() => splash.remove(), 500);
  }, remaining);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Дополнительная блокировка pinch-zoom и двойного тапа-зума: в установленном
// standalone-приложении на телефоне viewport-мета не всегда полностью
// предотвращает жестовое масштабирование, особенно после обновления страницы.
let lastTouchEnd = 0;
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);