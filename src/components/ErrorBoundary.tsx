import { Component, ReactNode } from 'react';
import { safeGetSession, safeSetSession } from '@/lib/storage';

type Props = { children: ReactNode };
type State = { hasError: boolean };

const AUTO_RELOAD_KEY = 'error-boundary-auto-reload';

/**
 * Глобальный перехватчик ошибок рендера React. Без него любая необработанная
 * ошибка при монтировании приложения (повреждённый кэш Service Worker со
 * старой версией сайта, редкий сбой сети при первой загрузке чанка и т.п.)
 * оставляет пользователя один на один с пустым тёмным экраном (см. index.html
 * — фон html закрашен заранее) без единой подсказки, что произошло — выглядит
 * как "приложение не открывается", а на деле React просто не смог отрисоваться.
 *
 * При первой же ошибке: один раз чистим кэш Service Worker (частая причина —
 * там залежался JS от старой версии сайта, несовместимый с текущим index.html)
 * и перезагружаем страницу. Если это не помогло (ошибка повторилась) — во
 * второй раз просто показываем экран с понятным текстом и кнопкой "Обновить",
 * чтобы человек не сидел с чёрным экраном и не переустанавливал приложение.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);

    if (safeGetSession(AUTO_RELOAD_KEY)) {
      return;
    }
    safeSetSession(AUTO_RELOAD_KEY, '1');

    const clearCachesAndReload = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister())))
          .catch(() => {})
          .finally(() => {
            if (typeof caches !== 'undefined') {
              caches.keys()
                .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                .catch(() => {})
                .finally(() => window.location.reload());
            } else {
              window.location.reload();
            }
          });
      } else {
        window.location.reload();
      }
    };

    clearCachesAndReload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            background: '#0e0e0f',
            color: '#ede7da',
            fontFamily: 'Rubik, sans-serif',
          }}
        >
          <p style={{ fontSize: '15px', color: '#8c8a83', maxWidth: '320px' }}>
            Не удалось загрузить приложение. Проверьте соединение с интернетом и обновите страницу.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: '2px',
              border: 'none',
              background: '#e5432a',
              color: '#0e0e0f',
              fontWeight: 600,
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;