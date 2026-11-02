import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cabApi, Client } from './api';

type Car = { id: number; client_id: number | null; owner: string | null; vin: string | null; plate: string | null; model: string | null; notes: string | null; client_name: string | null; client_phone: string | null };

const empty = { id: 0, client_id: '', owner: '', vin: '', plate: '', model: '', notes: '' };

const GarageTab = ({ url }: { url: string }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = useCallback(
    async (q = '') => {
      const [g, c] = await Promise.all([cabApi<{ cars: Car[] }>(url, 'garage_list', { query: q }), cabApi<{ clients: Client[] }>(url, 'clients_list')]);
      setCars(g.cars);
      setClients(c.clients);
    },
    [url],
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await cabApi(url, 'garage_save', { ...form, client_id: form.client_id ? Number(form.client_id) : null });
      setForm(empty);
      load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    await cabApi(url, 'garage_delete', { id });
    load(query);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Гараж</h2>
        <p className="text-sm text-muted-foreground">Автомобили клиентов: чей автомобиль, VIN, госномер, примечания.</p>
      </div>
      <form onSubmit={save} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 border border-border rounded-sm p-4">
        <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="h-10 rounded-sm border border-input bg-background px-3 text-sm">
          <option value="">Клиент не выбран</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
        <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Модель" />
        <Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="VIN" />
        <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="Госномер" />
        <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Владелец (если нет в клиентах)" />
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Примечание" />
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit">{form.id ? 'Сохранить' : 'Добавить автомобиль'}</Button>
          {form.id > 0 && (
            <Button type="button" variant="outline" onClick={() => setForm(empty)}>
              Отмена
            </Button>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(query);
        }}
        className="flex gap-2 max-w-xl"
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Клиент, телефон, VIN, госномер, модель" />
        <Button type="submit" variant="outline">
          <Icon name="Search" size={14} />
        </Button>
      </form>
      {cars.length === 0 ? (
        <p className="text-muted-foreground">В гараже пока нет автомобилей.</p>
      ) : (
        <div className="border border-border rounded-sm divide-y divide-border">
          {cars.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium">{c.model || 'Без модели'}</div>
                <div className="text-muted-foreground">{[c.vin, c.plate].filter(Boolean).join(' · ')}</div>
                <div className="text-muted-foreground">{[c.client_name || c.owner, c.client_phone].filter(Boolean).join(' · ')}</div>
                {c.notes && <div className="text-xs text-muted-foreground mt-1">{c.notes}</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setForm({ id: c.id, client_id: c.client_id ? String(c.client_id) : '', owner: c.owner || '', vin: c.vin || '', plate: c.plate || '', model: c.model || '', notes: c.notes || '' })}>
                  <Icon name="Pencil" size={14} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                  <Icon name="Trash2" size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GarageTab;
