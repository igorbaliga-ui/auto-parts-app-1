type Client = {
  phone_last10: string;
  name: string | null;
  referral_bonus: number;
  friends_invited_count: number;
};

export const exportReferralsToExcel = async (referrers: Client[]) => {
  const XLSX = await import('xlsx');

  const header = ['Имя', 'Телефон', 'Приглашено друзей', 'Заработано бонусов'];
  const rows = referrers.map((c) => [
    c.name || '',
    c.phone_last10,
    c.friends_invited_count,
    c.referral_bonus,
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = header.map(() => ({ wch: 22 }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Рефералы');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `zapoptom-referaly-${today}.xlsx`);
};
