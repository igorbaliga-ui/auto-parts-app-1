import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 70;
const MAX_PULL = 100;

/**
 * Свайп вниз в самом верху страницы (только тач-устройства, только когда
 * страница проскроллена до самого верха) запускает переданный onRefresh.
 * Возвращает текущее расстояние оттяжки и флаг refreshing — для отрисовки
 * индикатора и сдвига контента.
 */
export const usePullToRefresh = (
  onRefresh: () => Promise<void> | void,
  disabled = false,
) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const distance = useRef(0);
  const active = useRef(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined" || !("ontouchstart" in window)) return;

    const onTouchStart = (e: TouchEvent) => {
      // Если жест начался внутри открытого диалога/шторки (например, формы «Заявка
      // на подбор», которая на /garage открывается поверх страницы) — не перехватываем
      // его глобальным pull-to-refresh. Иначе он иногда «съедает» свайп внутри формы
      // через preventDefault(), из-за чего скролл там срабатывает через раз.
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-vaul-drawer], [role="dialog"]')) {
        active.current = false;
        return;
      }
      if (refreshingRef.current || window.scrollY > 0) {
        active.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        active.current = false;
        distance.current = 0;
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      const next = Math.min(delta * 0.5, MAX_PULL);
      distance.current = next;
      setPullDistance(next);
    };

    const onTouchEnd = async () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (distance.current >= PULL_THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullDistance(0);
          distance.current = 0;
        }
      } else {
        setPullDistance(0);
        distance.current = 0;
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled]);

  return { pullDistance, refreshing, threshold: PULL_THRESHOLD };
};