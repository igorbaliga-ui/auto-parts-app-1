import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { cabApi, Client } from './api';

const empty = { id: 0, full_name: '', phone: '', car: '', notes: '' };

const ClientsTab = ({ url }: { url: string }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const d = await cabApi<{ clients: Client[] }>(url, 'clients_list');
    setClients(d.clients);
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await cabApi(url, 'client_save', form);
      setForm(empty);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    await cabApi(url, 'client_delete', { id });
    load();
  };

  const shown = clients.filter((c) => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={save} className="flex flex-col gap-2 border border-border rounded-sm p-4 h-fit">
        <h2 className="font-head uppercase tracking-wide text-lg">{form.id ? 'Изменить клиента' : 'Создать клиента'}</h2>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="ФИО *" />
        <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Телефон" />
        <Input value={form.car || ''} onChange={(e) => setForm({ ...form, car: e.target.value })} placeholder="Авто, например Toyota Camry 2014" />
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Заметки" rows={3} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">Сохранить</Button>
          {form.id > 0 && (
            <Button type="button" variant="outline" onClick={() => setForm(empty)}>
              Отмена
            </Button>
          )}
        </div>
      </form>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-head uppercase tracking-wide text-lg">Клиенты ({clients.length})</h2>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по ФИО или телефону" className="max-w-xs" />
        </div>
        {shown.length === 0 ? (
          <p className="text-muted-foreground">Пока пусто</p>
        ) : (
          <div className="border border-border rounded-sm divide-y divide-border">
            {shown.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <div>
                  <div className="font-medium">{c.full_name}</div>
                  <div className="text-muted-foreground">{[c.phone, c.car].filter(Boolean).join(' · ')}</div>
                  {c.notes && <div className="text-xs text-muted-foreground mt-1">{c.notes}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setForm({ id: c.id, full_name: c.full_name, phone: c.phone || '', car: c.car || '', notes: c.notes || '' })}>
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
    </div>
  );
};

export default ClientsTab;
