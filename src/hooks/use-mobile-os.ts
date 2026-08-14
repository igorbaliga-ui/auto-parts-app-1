/**
 * Иконки «Установить на iPhone/Android» имеют смысл только на мобильных
 * устройствах — на Windows/Linux/macOS десктопе установить приложение
 * этим способом нельзя, поэтому хук определяет, открыт ли сайт с телефона
 * или планшета (iOS/Android), чтобы на десктопе эти иконки не показывать.
 */
export const useIsMobileOs = () => {
  if (typeof navigator === 'undefined') return false;

  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
};
