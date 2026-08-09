import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Прячем HTML/CSS-заставку (index.html) сразу после того, как React смонтировал
// приложение. requestAnimationFrame ждёт первый реальный кадр отрисовки, чтобы
// заставка не исчезла на мгновение раньше, чем контент готов показаться под ней.
requestAnimationFrame(() => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('app-splash--hide');
  setTimeout(() => splash.remove(), 500);
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