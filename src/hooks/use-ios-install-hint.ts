/**
 * На iOS нет события beforeinstallprompt (оно есть только в Chrome/Android),
 * поэтому кнопку «Установить» показать нельзя — вместо этого нужно объяснить
 * пользователю вручную зайти через «Поделиться» → «На экран Домой» в Safari.
 * Хук определяет: это iPhone/iPad, сайт открыт в Safari (не в уже установленном
 * приложении) — то есть стоит показать такую подсказку.
 */
export const useIsIosInstallable = () => {
  if (typeof navigator === 'undefined') return false;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  return isIos && !isStandalone;
};
