const VIN_MAX_LENGTH = 20;

/**
 * Приводит ввод VIN-кода или Frame-номера к безопасному виду: обрезает до
 * 20 символов и оставляет только латинские буквы, цифры и дефис (Frame-номер,
 * в отличие от VIN, часто содержит дефис, например "GH8-1234567"). HTML-атрибут
 * maxLength на некоторых Android-клавиатурах (автоподстановка, голосовой ввод,
 * IME) не всегда соблюдается, поэтому ограничение дополнительно применяется в
 * JS при каждом вводе — так поле гарантированно не примет строку длиннее нужной
 * и без посторонних символов, которые могли бы попасть дальше в запрос к серверу.
 */
export function sanitizeVinInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, VIN_MAX_LENGTH);
}

function pluralizeSymbols(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'символ';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'символа';
  return 'символов';
}

/**
 * Валидная длина VIN/Frame-номера — 10 (короткие форматы) или 17 (полный VIN)
 * символов. Функция подсказывает клиенту, сколько символов ещё нужно ввести
 * до ближайшей допустимой длины; возвращает null, если длина уже валидна
 * (или поле пустое — тогда подсказка не нужна, есть placeholder).
 */
export function getVinLengthHint(vin: string): string | null {
  const len = vin.length;
  if (len === 0 || len === 10 || len === 17) return null;
  if (len > 17) {
    const extra = len - 17;
    return `Лишние ${extra} ${pluralizeSymbols(extra)} — должно быть 10 или 17`;
  }
  const target = len < 10 ? 10 : 17;
  const remaining = target - len;
  return `Ещё ${remaining} ${pluralizeSymbols(remaining)} до ${target}`;
}