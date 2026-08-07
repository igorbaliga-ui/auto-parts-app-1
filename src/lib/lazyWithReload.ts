import { lazy } from 'react';

/**
 * Обёртка над React.lazy(): если после выката нового билда старая вкладка
 * пытается подгрузить чанк (например /pages/Garage.tsx), а сервер уже отдаёт
 * файлы новой версии — динамический import падает с "Failed to fetch
 * dynamically imported module". Вместо белого экрана с ошибкой один раз
 * перезагружаем страницу — пользователь получает актуальную версию.
 */
export function lazyWithReload<T extends { default: React.ComponentType<unknown> }>(
  factory: () => Promise<T>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const reloadedKey = 'chunk-reload-attempted';
      if (!sessionStorage.getItem(reloadedKey)) {
        sessionStorage.setItem(reloadedKey, '1');
        window.location.reload();
        return new Promise<T>(() => {});
      }
      sessionStorage.removeItem(reloadedKey);
      throw error;
    }
  });
}
