/**
 * Обёртка над Badging API (navigator.setAppBadge/clearAppBadge) — показывает точку
 * с числом на иконке PWA, установленного на рабочий стол/главный экран (Android, десктоп,
 * iOS 16.4+). Браузер сам определяет, какое установленное приложение обновлять, по scope
 * текущей страницы — поэтому один и тот же вызов из /admin и из /garage корректно
 * обновляет бейдж каждого приложения независимо, если оба установлены отдельно.
 * API поддерживается не всеми браузерами — вызовы тихо игнорируются, если его нет.
 */
type NavigatorWithBadge = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export const setAppBadge = (count: number) => {
  const nav = navigator as NavigatorWithBadge;
  try {
    if (count > 0 && nav.setAppBadge) {
      nav.setAppBadge(count).catch(() => {});
    } else if (nav.clearAppBadge) {
      nav.clearAppBadge().catch(() => {});
    }
  } catch {
    // Badging API недоступен — тихо игнорируем
  }
};
