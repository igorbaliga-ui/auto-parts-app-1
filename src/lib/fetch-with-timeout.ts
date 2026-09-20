/**
 * Обёртка над fetch() с ограничением по времени ожидания. На слабой мобильной
 * сети запрос иногда не падает с ошибкой, а зависает на неопределённое время —
 * без таймаута экран приложения мог "вечно грузиться", пока пользователь не
 * закроет его полностью и не откроет заново. По истечении timeoutMs запрос
 * прерывается через AbortController и промис отклоняется, как при обычной
 * сетевой ошибке — весь остальной код (try/catch) обрабатывает это как обрыв сети.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}
