import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { safeGetSession } from '@/lib/storage';
import funcs from '../../../backend/func2url.json';
import { cabApi, Client } from './api';

type Result = { ai_articles: string; vin_decoded: string; source: string; via: string; catalog_note: string };

const AI_URL = (funcs as Record<string, string>)['lead-ai-articles'] || '';
const CAB_URL = (funcs as Record<string, string>)['cabinet'] || '';

type ClientCar = { car: string; vin: string };

const OemTab = ({ onSearch }: { onSearch: (q: string) => void }) => {
  const [vin, setVin] = useState('');
  const [car, setCar] = useState('');
  const [parts, setParts] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [cars, setCars] = useState<ClientCar[]>([]);

  useEffect(() => {
    cabApi<{ clients: Client[] }>(CAB_URL, 'clients_list')
      .then((d) => setClients(d.clients))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clientId) {
      setCars([]);
      return;
    }
    let alive = true;
    cabApi<{ cars: ClientCar[] }>(CAB_URL, 'client_cars', { id: Number(clientId) })
      .then((d) => {
        if (!alive) return;
        setCars(d.cars);
        if (d.cars[0]) {
          setVin(d.cars[0].vin);
          setCar(d.cars[0].car);
        }
      })
      .catch(() => alive && setCars([]));
    return () => {
      alive = false;
    };
  }, [clientId]);

  const pickCar = (idx: string) => {
    const c = cars[Number(idx)];
    if (!c) return;
    setVin(c.vin);
    setCar(c.car);
  };

  const run = async () => {
    setLoading(true);
    setError('');
    setRes(null);
    try {
      const r = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': safeGetSession('admin_password') || '' },
        body: JSON.stringify({ action: 'free_search', vin, car_name: car, parts }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ошибка поиска');
      setRes(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const articles = res ? Array.from(new Set((res.ai_articles.match(/[A-Za-z0-9][A-Za-z0-9\-./]{4,}/g) || []).filter((a) => /\d/.test(a)))) : [];

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Оригинальный каталог и ИИ-поиск OEM</h2>
        <p className="text-sm text-muted-foreground">Найдите оригинальные номера по VIN или названию авто, затем проверьте цены у своих поставщиков.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 rounded-sm border border-input bg-background px-3 text-sm">
          <option value="">Клиент не выбран</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} {c.phone || ''}
            </option>
          ))}
        </select>
        {cars.length > 0 && (
          <select onChange={(e) => pickCar(e.target.value)} className="h-10 rounded-sm border border-input bg-background px-3 text-sm">
            {cars.map((c, i) => (
              <option key={`${c.car}-${i}`} value={i}>
                {c.car}
                {c.vin ? ` · ${c.vin}` : ''}
              </option>
            ))}
          </select>
        )}
        <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN" />
        <Input value={car} onChange={(e) => setCar(e.target.value)} placeholder="Или авто, например BMW 520d 2003" />
      </div>
      <Textarea value={parts} onChange={(e) => setParts(e.target.value)} rows={3} placeholder="Какие запчасти нужны (обязательно), например: передние тормозные колодки" />
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={loading || !parts.trim() || (!vin.trim() && !car.trim())}>
          <Icon name="Search" size={14} className="mr-1.5" />
          {loading ? 'Ищу...' : 'Найти номера'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
        {!error && !loading && !parts.trim() && <span className="text-sm text-muted-foreground">Укажите, какие запчасти нужны</span>}
        {!error && !loading && parts.trim() && !vin.trim() && !car.trim() && <span className="text-sm text-muted-foreground">Укажите VIN или авто</span>}
      </div>
      {res && (
        <div className="border border-border rounded-sm p-4 flex flex-col gap-3">
          {res.vin_decoded && <div className="text-sm text-muted-foreground">Авто: {res.vin_decoded}</div>}
          <pre className="whitespace-pre-wrap text-sm font-sans">{res.ai_articles || 'Ничего не найдено'}</pre>
          {res.catalog_note && <div className="text-xs text-muted-foreground">{res.catalog_note}</div>}
          {articles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {articles.slice(0, 20).map((a) => (
                <Button key={a} size="sm" variant="outline" onClick={() => onSearch(a)}>
                  Цены: {a}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OemTab;
