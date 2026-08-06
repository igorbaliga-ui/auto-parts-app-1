import { useCallback, useEffect, useState } from 'react';

const PUSH_SUBSCRIBE_URL = 'https://functions.poehali.dev/30d578c6-e25c-4fdc-b648-85e2cbdc2a65';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const SUBSCRIBED_PHONE_KEY = 'zapoptom_garage_push_phone';

const normalizePhoneLast10 = (phone: string) => phone.replace(/\D/g, '').slice(-10);

/**
 * Управляет подпиской браузера на Web Push уведомления, привязанной к номеру телефона
 * клиента в «Гараже». Используется, чтобы присылать уведомления о статусе заказа
 * (например «деталь поступила») прямо на устройство клиента.
 *
 * Подписка браузера (Service Worker) технически одна на весь браузер, а не на аккаунт,
 * поэтому дополнительно запоминаем в localStorage, для какого именно телефона она была
 * подтверждена — если в этом же браузере войти под другим номером, подписка будет считаться
 * неактивной для него, и баннер «Включить уведомления» покажется снова.
 */
export const usePushSubscription = (phone: string | null) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isPushSupported() ? Notification.permission : 'unsupported',
  );
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || !phone) {
      setSubscribed(false);
      return;
    }
    const phoneLast10 = normalizePhoneLast10(phone);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        const subscribedPhone = localStorage.getItem(SUBSCRIBED_PHONE_KEY);
        setSubscribed(!!sub && subscribedPhone === phoneLast10);
      })
      .catch(() => {});
  }, [phone]);

  const subscribe = useCallback(async () => {
    if (!isPushSupported() || !phone) return false;
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const keyRes = await fetch(PUSH_SUBSCRIBE_URL);
      const keyData = await keyRes.json();
      const publicKey = keyData.public_key;
      if (!publicKey) return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await fetch(PUSH_SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, subscription: sub.toJSON() }),
      });
      localStorage.setItem(SUBSCRIBED_PHONE_KEY, normalizePhoneLast10(phone));
      setSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setSubscribing(false);
    }
  }, [phone]);

  return { permission, subscribing, subscribed, subscribe };
};