export const CITY_STORAGE_KEY = 'zapoptom_garage_city';
export const DEFAULT_CITY = 'Сургут';

export const cities = [
  'Сургут', 'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Красноярск', 'Самара', 'Уфа',
  'Ростов-на-Дону', 'Краснодар', 'Омск', 'Воронеж', 'Пермь',
  'Волгоград', 'Саратов', 'Тюмень', 'Тольятти', 'Ижевск',
];

export const getStoredCity = () => localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY;

export const setStoredCity = (city: string) => {
  localStorage.setItem(CITY_STORAGE_KEY, city);
};
