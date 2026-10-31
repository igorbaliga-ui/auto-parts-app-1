import { useEffect, useState } from 'react';

/**
 * Определяет, открыт ли сайт как уже установленное PWA-приложение
 * (standalone-режим), а не в обычной вкладке браузера. В этом режиме
 * незачем показывать иконки «скачать на Android/iPhone» — вместо них
 * показываем кнопку «Поделиться» приложением.
 * Определяется после монтирования: на сервере браузера нет.
 */
export const useIsStandalone = () => {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
  }, []);

  return standalone;
};
