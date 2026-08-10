import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

const SITE_CONTACTS_URL = 'https://functions.poehali.dev/2da0d397-3cdf-4621-8dce-e973cad2dc6d';

type ContactsData = {
  phone_value: string;
  phone_href: string;
  email_value: string;
  email_href: string;
  address_value: string;
  hours_value: string;
  whatsapp_href: string | null;
  telegram_href: string | null;
  vk_href: string | null;
  instagram_href: string | null;
};

type AdminContactsTabProps = {
  adminPassword: string;
};

/**
 * Отдельная вкладка в админке для редактирования публичных контактов сайта
 * (блок «Контакты» на главной странице) — телефон, почта, адрес склада, часы работы.
 * Хранятся в таблице site_contacts (одна строка), отдаются на главной без пароля.
 */
const AdminContactsTab = ({ adminPassword }: AdminContactsTabProps) => {
  const [data, setData] = useState<ContactsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(SITE_CONTACTS_URL)
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((d) => setData(d))
      .catch(() => toast({ title: 'Не удалось загрузить контакты', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field: keyof ContactsData, value: string) => {
    setData((d) => (d ? { ...d, [field]: value } : d));
  };

  const socialFields: { field: keyof ContactsData; label: string; icon: string; placeholder: string }[] = [
    { field: 'whatsapp_href', label: 'WhatsApp', icon: 'MessageCircle', placeholder: 'https://wa.me/79324027937' },
    { field: 'telegram_href', label: 'Telegram', icon: 'Send', placeholder: 'https://t.me/username' },
    { field: 'vk_href', label: 'ВКонтакте', icon: 'Share2', placeholder: 'https://vk.com/username' },
    { field: 'instagram_href', label: 'Instagram', icon: 'Instagram', placeholder: 'https://instagram.com/username' },
  ];

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(SITE_CONTACTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify(data),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || 'request failed');
      toast({ title: 'Контакты сохранены', description: 'Изменения уже видны на сайте.' });
    } catch {
      toast({ title: 'Не удалось сохранить', description: 'Попробуйте ещё раз.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Загружаем…</p>;
  }

  if (!data) {
    return <p className="text-muted-foreground">Не удалось загрузить контакты.</p>;
  }

  return (
    <div className="max-w-xl bg-card border border-steel rounded-sm p-6 flex flex-col gap-5">
      <h2 className="font-head uppercase tracking-wide text-lg flex items-center gap-2">
        <Icon name="Contact" size={18} className="text-primary" />
        Контакты сайта
      </h2>
      <p className="text-sm text-muted-foreground -mt-3">
        Эти данные показываются в блоке «Контакты» на главной странице сайта.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Телефон (текст)
          </label>
          <Input
            value={data.phone_value}
            onChange={(e) => setField('phone_value', e.target.value)}
            placeholder="+7 (932) 402-79-37"
          />
        </div>
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Телефон (ссылка для звонка)
          </label>
          <Input
            value={data.phone_href}
            onChange={(e) => setField('phone_href', e.target.value)}
            placeholder="tel:+79324027937"
          />
        </div>
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Почта (текст)
          </label>
          <Input
            value={data.email_value}
            onChange={(e) => setField('email_value', e.target.value)}
            placeholder="zapoptom@bk.ru"
          />
        </div>
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Почта (ссылка для письма)
          </label>
          <Input
            value={data.email_href}
            onChange={(e) => setField('email_href', e.target.value)}
            placeholder="mailto:zapoptom@bk.ru"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Адрес склада
          </label>
          <Input
            value={data.address_value}
            onChange={(e) => setField('address_value', e.target.value)}
            placeholder="г. Сургут, ул. Республики, 71/3с1"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Часы работы
          </label>
          <Input
            value={data.hours_value}
            onChange={(e) => setField('hours_value', e.target.value)}
            placeholder="Пн–Сб, 9:00–20:00"
          />
        </div>
      </div>

      <div className="border-t border-steel pt-5">
        <h3 className="font-head uppercase tracking-wide text-sm mb-1">Соцсети и мессенджеры</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Необязательно — оставьте поле пустым, если ссылки нет, и иконка не будет показана на сайте.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {socialFields.map(({ field, label, icon, placeholder }) => (
            <div key={field}>
              <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Icon name={icon} size={14} />
                {label}
              </label>
              <Input
                value={data[field] || ''}
                onChange={(e) => setField(field, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="font-head uppercase tracking-wide h-11 self-start px-8"
      >
        {saving ? 'Сохраняем…' : 'Сохранить'}
      </Button>
    </div>
  );
};

export default AdminContactsTab;