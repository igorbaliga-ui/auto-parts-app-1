/**
 * Нормализует ввод в поле телефона: если это первый введённый символ и он цифра —
 * заменяет её на "+7", чтобы пользователь мог просто начать набирать номер
 * (например с 8 или 9), и он автоматически стал в формате +7XXXXXXXXXX.
 */
export function normalizePhoneInput(prevValue: string, rawValue: string): string {
  // Удаление символов — пропускаем без изменений
  if (rawValue.length <= prevValue.length) return rawValue;

  if (prevValue.length === 0) {
    const firstChar = rawValue[0];
    if (/\d/.test(firstChar)) {
      return '+7' + rawValue.slice(1);
    }
  }

  return rawValue;
}
