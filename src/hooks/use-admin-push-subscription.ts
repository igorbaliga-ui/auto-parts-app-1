import { useCallback, useEffect, useState } from 'react';
import { isPushSupported } from './use-push-subscription';

const ADMIN_PUSH_SUBSCRIBE_URL = 'https://functions.poehali.dev/06752791-4271-4e2d-91d5-43d770e6de83';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Управляет подпиской браузера менеджера на Web Push уведомления о новых заявках
 * (для страницы /admin, установленной как приложение на телефон).
 */
export const useAdminPushSubscription = (adminPassword: string | null) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isPushSupported() ? Notification.permission : 'unsupported',
  );
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || !adminPassword) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, [adminPassword]);

  const subscribe = useCallback(async () => {
    if (!isPushSupported() || !adminPassword) return false;
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const keyRes = await fetch(ADMIN_PUSH_SUBSCRIBE_URL);
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

      await fetch(ADMIN_PUSH_SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setSubscribing(false);
    }
  }, [adminPassword]);

  return { permission, subscribing, subscribed, subscribe };
};
