import { lazy } from 'react';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Обёртка над React.lazy():
 * 1. Сначала пробует подгрузить модуль ещё пару раз с небольшой паузой —
 *    короткие сетевые сбои (например, dev-сервер на секунду переподключается)
 *    из-за этого не приводят к падению экрана.
 * 2. Если после повторов всё ещё ошибка — вероятно, вышел новый билд и
 *    старая вкладка запрашивает уже несуществующий чанк ("Failed to fetch
 *    dynamically imported module"). Вместо белого экрана с ошибкой один раз
 *    перезагружаем страницу — пользователь получает актуальную версию.
 */
export function lazyWithReload<T extends { default: React.ComponentType<unknown> }>(
  factory: () => Promise<T>,
) {
  return lazy(async () => {
    const attempts = 3;
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (i < attempts - 1) await wait(400 * (i + 1));
      }
    }

    const reloadedKey = 'chunk-reload-attempted';
    if (!sessionStorage.getItem(reloadedKey)) {
      sessionStorage.setItem(reloadedKey, '1');
      window.location.reload();
      return new Promise<T>(() => {});
    }
    sessionStorage.removeItem(reloadedKey);
    throw lastError;
  });
}