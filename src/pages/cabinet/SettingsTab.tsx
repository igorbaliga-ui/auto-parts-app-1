import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { safeGetItem, safeSetItem } from '@/lib/storage';

const KEY = 'cabinet_settings';
const defaults = { pageSize: '50', analogs: true, hideEmpty: false };

export type CabSettings = typeof defaults;

export const loadSettings = (): CabSettings => {
  try {
    return { ...defaults, ...JSON.parse(safeGetItem(KEY) || '{}') };
  } catch {
    return defaults;
  }
};

const SettingsTab = () => {
  const [s, setS] = useState<CabSettings>(defaults);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setS(loadSettings());
  }, []);

  const save = () => {
    safeSetItem(KEY, JSON.stringify(s));
    setMsg('Сохранено');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Настройки</h2>
        <p className="text-sm text-muted-foreground">Настройки хранятся в этом браузере.</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Строк в результатах поиска
        <select value={s.pageSize} onChange={(e) => setS({ ...s, pageSize: e.target.value })} className="h-10 rounded-sm border border-input bg-background px-3 w-32">
          {['25', '50', '100', '200'].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={s.analogs} onCheckedChange={(v) => setS({ ...s, analogs: v === true })} />
        Включать похожие артикулы по умолчанию
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={s.hideEmpty} onCheckedChange={(v) => setS({ ...s, hideEmpty: v === true })} />
        Скрывать позиции с нулевым остатком
      </label>
      <div className="flex items-center gap-3">
        <Button onClick={save}>Сохранить</Button>
        {msg && <span className="text-sm text-emerald-500">{msg}</span>}
      </div>
    </div>
  );
};

export default SettingsTab;
