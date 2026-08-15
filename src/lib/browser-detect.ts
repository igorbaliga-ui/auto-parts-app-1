/**
 * Определяет, открыт ли сайт именно в том браузере, который нужен для
 * установки PWA — Safari на iOS или Chrome на Android. Используется в
 * инструкции «Установка приложения», чтобы не показывать шаг «откройте сайт
 * в нужном браузере», если пользователь уже находится в нём.
 */
export const isIosSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  // Safari на iOS содержит "Safari", но сторонние браузеры (Chrome, Firefox,
  // Yandex и т.д. на iOS) добавляют в UA свои маркеры — их исключаем
  const isThirdPartyBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|MiuiBrowser|GSA/i.test(ua);
  return isIos && /safari/i.test(ua) && !isThirdPartyBrowser;
};

export const isAndroidChrome = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  // Chrome на Android содержит "Chrome", но другие браузеры на движке Chromium
  // (Samsung Internet, Yandex, Opera, Edge) добавляют собственные маркеры
  const isThirdPartyBrowser = /SamsungBrowser|YaBrowser|OPR\/|EdgA|MiuiBrowser|HuaweiBrowser/i.test(ua);
  return isAndroid && /chrome/i.test(ua) && !isThirdPartyBrowser;
};

/** Определяет, что сайт открыт именно в браузере Safari (мобильном или
 * десктопном) — в отличие от isIosSafari, не привязан к iOS: десктопный
 * Safari на Mac тоже считается. Chrome, Edge, Firefox, Яндекс и другие
 * браузеры на любой платформе тоже содержат "Safari" в строке UA (это
 * особенность WebKit/Blink), поэтому их явно исключаем. */
export const isSafariBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isThirdPartyBrowser =
    /Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|EdgA|OPiOS|OPR\/|YaBrowser|SamsungBrowser|MiuiBrowser|HuaweiBrowser|UCBrowser|GSA/i.test(
      ua,
    );
  return /safari/i.test(ua) && !isThirdPartyBrowser;
};

/** Определяет операционную систему устройства (не браузер) — используется,
 * чтобы в инструкции установки показывать только релевантную вкладку
 * (iPhone/Android), скрывая инструкцию для чужой платформы. */
export const getMobileOs = (): 'ios' | 'android' | null => {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
};

/** Превращает обычную https-ссылку в Android intent-ссылку, которая
 * принудительно открывает именно Chrome, даже если у пользователя выбран
 * другой браузер по умолчанию (Samsung Internet, Яндекс и т.д.) — так
 * реферальный код гарантированно фиксируется в том же браузере, где потом
 * будет установлено приложение. На iOS такого системного механизма нет —
 * там принудительно открыть Safari из ссылки технически невозможно. */
export const toAndroidChromeIntentUrl = (url: string): string => {
  const u = new URL(url);
  const rest = u.pathname + u.search + u.hash;
  return `intent://${u.host}${rest}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
};