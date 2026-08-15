// Читаемое доменное имя сайта — используется вместо window.location.origin,
// который для кириллического домена (запоптом.рф) отдаёт punycode-вид
// (https://xn--80anqhaeby.xn--p1ai/), непонятный для пользователя при шаринге ссылки.
export const SITE_HOST = "запоптом.рф";
export const SITE_URL = `https://${SITE_HOST}/`;
