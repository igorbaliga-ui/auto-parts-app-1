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

/**
 * Управляет подпиской браузера на Web Push уведомления, привязанной к номеру телефона
 * клиента в «Гараже». Используется, чтобы присылать уведомления о статусе заказа
 * (например «деталь поступила») прямо на устройство клиента.
 */
export const usePushSubscription = (phone: string | null) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isPushSupported() ? Notification.permission : 'unsupported',
  );
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || !phone) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
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
