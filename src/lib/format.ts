/** Общие форматтеры дат, денег и бонусов — используются в /admin и в «Гараже». */

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatMoney = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';

const bonusWord = (n: number) => {
  const abs = Math.abs(Math.round(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'бонус';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'бонуса';
  return 'бонусов';
};

export const formatBonus = (n: number) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)} ${bonusWord(n)}`;
