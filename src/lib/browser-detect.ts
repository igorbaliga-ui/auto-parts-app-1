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

/**
 * На iOS установить PWA можно только через Safari — сторонние браузеры
 * (Chrome, Yandex и т.д.) технически не умеют добавлять сайт на экран «Домой».
 * Используется, чтобы вместо пошаговой инструкции показать таким пользователям
 * просьбу переоткрыть сайт в Safari.
 */
export const isIosNonSafari = (): boolean => {
  return getMobileOs() === 'ios' && !isIosSafari();
};