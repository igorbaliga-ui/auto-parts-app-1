import { useEffect, useState } from 'react';

/**
 * Иконки «Установить на iPhone/Android» имеют смысл только на мобильных
 * устройствах — на Windows/Linux/macOS десктопе установить приложение
 * этим способом нельзя, поэтому хук определяет, открыт ли сайт с телефона
 * или планшета (iOS/Android), чтобы на десктопе эти иконки не показывать.
 * Определяется после монтирования: на сервере браузера нет.
 */
export const useIsMobileOs = () => {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(/android|iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  return mobile;
};
