import { useEffect, useState } from 'react';
import { useGarageAuth } from '@/hooks/use-garage-auth';

const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';

/**
 * Проверяет, есть ли у клиента заказ в работе с пометкой «Поступил» —
 * чтобы показать зелёную точку на иконке «Мой гараж» в шапке сайта.
 */
export const useGarageArrived = () => {
  const { authed, phone } = useGarageAuth();
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(() => {
    if (!authed || !phone) {
      setHasArrived(false);
      return;
    }
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(phone)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const orders: { status: string; arrived: boolean }[] = data.orders || [];
        setHasArrived(orders.some((o) => o.status !== 'done' && o.arrived));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authed, phone]);

  return hasArrived;
};
