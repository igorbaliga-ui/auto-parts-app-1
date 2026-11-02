import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { cabApi, fmtDate } from './api';

type H = { id: number; query: string; results_count: number; created_at: string };

const HistoryTab = ({ url, onRepeat }: { url: string; onRepeat: (q: string) => void }) => {
  const [list, setList] = useState<H[]>([]);

  const load = useCallback(async () => {
    const d = await cabApi<{ history: H[] }>(url, 'history_list');
    setList(d.history);
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  const del = async (payload: { id?: number; all?: boolean }) => {
    await cabApi(url, 'history_delete', payload);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-head uppercase tracking-wide text-xl">История поиска ({list.length})</h2>
        {list.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => del({ all: true })}>
            Очистить
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-muted-foreground">Поисков пока не было.</p>
      ) : (
        <div className="border border-border rounded-sm divide-y divide-border">
          {list.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="flex-1">
                <div className="font-medium">{h.query}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(h.created_at)} · найдено {h.results_count}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onRepeat(h.query)}>
                Повторить
              </Button>
              <Button size="sm" variant="outline" onClick={() => del({ id: h.id })}>
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
