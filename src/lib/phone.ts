const PHONE_MAX_LENGTH = 12;

/**
 * Оставляет в номере телефона только цифры и ведущий "+": на некоторых
 * Android-клавиатурах (автоподстановка, голосовой ввод, IME) атрибут
 * maxLength/type у поля не всегда соблюдается, поэтому посторонние символы
 * (буквы, HTML-теги и т.п.) отсекаются здесь же в JS при каждом вводе,
 * прежде чем значение уйдёт дальше в запрос к серверу.
 */
export function sanitizePhoneInput(raw: string): string {
  const hasLeadingPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  return (hasLeadingPlus ? '+' : '') + digits.slice(0, PHONE_MAX_LENGTH - (hasLeadingPlus ? 1 : 0));
}

/**
 * Нормализует ввод в поле телефона: если это первый введённый символ и он цифра —
 * заменяет её на "+7", чтобы пользователь мог просто начать набирать номер
 * (например с 8 или 9), и он автоматически стал в формате +7XXXXXXXXXX.
 */
export function normalizePhoneInput(prevValue: string, rawValue: string): string {
  const sanitized = sanitizePhoneInput(rawValue);

  // Удаление символов — пропускаем без изменений
  if (sanitized.length <= prevValue.length) return sanitized;

  if (prevValue.length === 0) {
    const firstChar = sanitized[0];
    if (/\d/.test(firstChar)) {
      return '+7' + sanitized.slice(1);
    }
  }

  return sanitized;
}

function pluralizeDigits(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'цифра';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'цифры';
  return 'цифр';
}

/**
 * Живая подсказка под полем телефона: сколько цифр ещё нужно ввести до полного
 * номера (+7 и 10 цифр — 11 цифр всего). Возвращает null, если поле пустое
 * (тогда достаточно placeholder) или номер уже введён полностью.
 */
export function getPhoneLengthHint(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0 || digits.length >= 11) return null;
  const remaining = 11 - digits.length;
  return `Ещё ${remaining} ${pluralizeDigits(remaining)}`;
}