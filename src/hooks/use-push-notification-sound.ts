import { useEffect } from 'react';

const SOUND_URL = '/notification-sound.mp3';

/**
 * Проигрывает короткий звуковой сигнал при получении push-уведомления, пока страница
 * открыта (сама push-нотификация браузера в этот момент звук не издаёт). Service Worker
 * (public/sw.js) при событии 'push' рассылает postMessage всем открытым вкладкам —
 * здесь мы просто слушаем эти сообщения и проигрываем звук. Используется и в админке,
 * и в личном кабинете «Гараж».
 */
export const usePushNotificationSound = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'push-received') return;
      const audio = new Audio(SOUND_URL);
      audio.play().catch(() => {});
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);
};
