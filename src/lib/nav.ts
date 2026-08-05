export type Tab = 'home' | 'vin' | 'how' | 'advantages' | 'contacts';

export const NAV_LINKS: { label: string; tab: Tab }[] = [
  { label: 'Подбор по VIN', tab: 'vin' },
  { label: 'Как заказать', tab: 'how' },
  { label: 'Преимущества', tab: 'advantages' },
  { label: 'Контакты', tab: 'contacts' },
];
