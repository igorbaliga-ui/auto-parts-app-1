import { Lead, ColumnKey, columns, messengerLabel, statusLabel, formatDate } from './adminTypes';

const cellValue = (l: Lead, key: ColumnKey): string | number => {
  switch (key) {
    case 'number':
      return l.id;
    case 'date':
      return formatDate(l.created_at);
    case 'vin':
      return l.vin || '';
    case 'car':
      return l.car_name || '';
    case 'name':
      return l.name || '';
    case 'phone':
      return l.phone || '';
    case 'city':
      return l.city || '';
    case 'messenger':
      return l.messenger ? messengerLabel[l.messenger] ?? l.messenger : '';
    case 'parts':
      return l.parts || '';
    case 'photo':
      return l.photo_url || '';
    case 'amount':
      return l.order_amount ?? '';
    case 'prepayment':
      return l.prepayment ?? '';
    case 'remaining':
      return l.remaining ?? '';
    case 'cashback':
      return l.cashback ?? '';
    case 'status':
      return statusLabel[l.status];
    case 'completed_at':
      return l.completed_at ? formatDate(l.completed_at) : '';
    case 'internal_note':
      return l.internal_note || '';
    default:
      return '';
  }
};

/**
 * Выгружает переданный список заявок в файл Excel (.xlsx), учитывая только видимые столбцы
 * (те, что сейчас не скрыты в таблице админки через «Столбцы»).
 *
 * Библиотека xlsx весит несколько мегабайт, поэтому подгружается динамически —
 * только в момент нажатия кнопки выгрузки, а не при открытии страницы.
 */
export const exportLeadsToExcel = async (
  leads: Lead[],
  isColumnVisible: (key: ColumnKey) => boolean,
) => {
  const XLSX = await import('xlsx');
  const visibleColumns = columns.filter((c) => isColumnVisible(c.key));

  const header = visibleColumns.map((c) => c.label);
  const rows = leads.map((l) => visibleColumns.map((c) => cellValue(l, c.key)));

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = visibleColumns.map(() => ({ wch: 18 }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Заявки');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `zapoptom-zayavki-${today}.xlsx`);
};