/**
 * Определяет, открыт ли сайт как уже установленное PWA-приложение
 * (standalone-режим), а не в обычной вкладке браузера. В этом режиме
 * незачем показывать иконки «скачать на Android/iPhone» — вместо них
 * показываем кнопку «Поделиться» приложением.
 */
export const useIsStandalone = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
};
