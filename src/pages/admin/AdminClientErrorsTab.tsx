import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { formatDate } from './adminTypes';

const CLIENT_ERROR_LOG_URL = 'https://functions.poehali.dev/2122af76-e9f8-4a07-aafe-3acf326e2a2f';

type ClientAppError = {
  id: number;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  resolved: boolean;
  created_at: string | null;
};

type AdminClientErrorsTabProps = {
  adminPassword: string;
};

/**
 * Журнал падений приложения на устройствах клиентов (ошибка рендера React, перехваченная
 * ErrorBoundary на фронтенде) — например, чёрный экран вместо сайта. Дублирует
 * push-уведомление менеджеру постоянным списком, чтобы случаи не терялись, если push
 * пропущен/отключён. Позволяет отметить случай отработанным.
 */
const AdminClientErrorsTab = ({ adminPassword }: AdminClientErrorsTabProps) => {
  const [errors, setErrors] = useState<ClientAppError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch(CLIENT_ERROR_LOG_URL, {
      headers: { 'X-Admin-Password': adminPassword },
    })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => setErrors(Array.isArray(data.errors) ? data.errors : []))
      .catch(() => setError('Не удалось загрузить журнал ошибок'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPassword]);

  const resolve = async (id: number) => {
    setResolvingId(id);
    try {
      const res = await fetch(CLIENT_ERROR_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ action: 'resolve', id }),
      });
      if (!res.ok) throw new Error('request failed');
      setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    } catch {
      toast({ title: 'Не удалось отметить как решённое', variant: 'destructive' });
    } finally {
      setResolvingId(null);
    }
  };

  const unresolvedCount = errors.filter((e) => !e.resolved).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-head uppercase tracking-wide text-lg flex items-center gap-2">
            <Icon name="MonitorX" size={18} className="text-primary" />
            Падения приложения у клиентов
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Случаи, когда сайт не открылся из-за ошибки в браузере клиента (например, чёрный экран) — дублирует push-уведомление.
            {unresolvedCount > 0 && (
              <span className="text-primary"> Неразобранных: {unresolvedCount}.</span>
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <Icon name="RefreshCw" size={14} className="mr-1.5" />
          Обновить
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
      ) : error ? (
        <p className="text-primary text-sm py-4">{error}</p>
      ) : errors.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 flex items-center gap-2">
          <Icon name="CircleCheck" size={16} className="text-primary" />
          Падений пока не было.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {errors.map((e) => (
            <div
              key={e.id}
              className={`bg-card border rounded-sm p-4 flex flex-col gap-2 ${
                e.resolved ? 'border-steel opacity-60' : 'border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Globe" size={13} className="text-muted-foreground" />
                  <span>{e.url || 'Страница неизвестна'}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {e.created_at ? formatDate(e.created_at) : ''}
                </span>
              </div>
              <p className="text-sm text-muted-foreground break-words">{e.message}</p>
              {e.user_agent && (
                <p className="text-xs text-muted-foreground/70 break-words">{e.user_agent}</p>
              )}
              <div className="flex items-center justify-between gap-3">
                {e.resolved ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Icon name="CircleCheck" size={13} />
                    Отмечено решённым
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={resolvingId === e.id}
                    onClick={() => resolve(e.id)}
                    className="text-xs h-7"
                  >
                    <Icon name="Check" size={13} className="mr-1.5" />
                    {resolvingId === e.id ? 'Отмечаем…' : 'Отметить решённым'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClientErrorsTab;
