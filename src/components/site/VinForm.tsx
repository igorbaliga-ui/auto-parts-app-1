import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const VinForm = () => {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ vin: '', name: '', phone: '', parts: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    const vin = form.vin.trim();
    if (vin.length < 11 || vin.length > 17) e.vin = 'VIN содержит от 11 до 17 символов';
    if (form.name.trim().length < 2) e.name = 'Укажите имя';
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Укажите корректный телефон';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSent(true);
    toast({
      title: 'Заявка принята',
      description: 'Менеджер свяжется с вами в течение 15 минут.',
    });
    setForm({ vin: '', name: '', phone: '', parts: '' });
  };

  return (
    <section id="vin" className="relative bg-card border-y border-border py-20 sm:py-28">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-5">
            <i className="w-11 h-0.5 bg-primary inline-block" />
            Форма подбора
          </span>
          <h2 className="font-head font-bold uppercase leading-[0.95] tracking-[-0.02em] text-4xl sm:text-5xl mb-5">
            Оставьте VIN —<br />
            <span className="text-primary">найдём деталь</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-[42ch] mb-8">
            Заполните форму: мы определим модель по VIN, подберём оригинал или
            качественный аналог и вышлем цену со сроком поставки.
          </p>
          <ul className="flex flex-col gap-4">
            {[
              { icon: 'ScanLine', t: 'Точный подбор по 17 символам VIN' },
              { icon: 'Users', t: 'Опт для сервисов, розница для водителей' },
              { icon: 'Clock', t: 'Ответ и расчёт в течение 15 минут' },
            ].map((i) => (
              <li key={i.t} className="flex items-center gap-3 text-foreground/90">
                <span className="w-9 h-9 shrink-0 rounded-sm bg-primary/15 flex items-center justify-center">
                  <Icon name={i.icon} className="text-primary" size={18} />
                </span>
                {i.t}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-background border border-steel rounded-sm p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                <Icon name="Check" className="text-primary" size={34} />
              </div>
              <h3 className="font-head uppercase tracking-wide text-2xl">
                Заявка отправлена
              </h3>
              <p className="text-muted-foreground max-w-[32ch]">
                Спасибо! Подберём деталь по VIN и перезвоним в течение 15 минут.
              </p>
              <Button
                variant="secondary"
                className="mt-2 font-head uppercase tracking-wide"
                onClick={() => setSent(false)}
              >
                Отправить ещё одну
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  VIN-код
                </label>
                <Input
                  value={form.vin}
                  onChange={set('vin')}
                  maxLength={17}
                  placeholder="XW8ZZZ• • • • • • •"
                  className="mt-1.5 uppercase tracking-[0.14em] h-12"
                />
                {errors.vin && <p className="text-primary text-xs mt-1">{errors.vin}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    Имя
                  </label>
                  <Input
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Ваше имя"
                    className="mt-1.5 h-12"
                  />
                  {errors.name && <p className="text-primary text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    Телефон
                  </label>
                  <Input
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="+7 900 000-00-00"
                    className="mt-1.5 h-12"
                  />
                  {errors.phone && (
                    <p className="text-primary text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  Интересующие запчасти
                </label>
                <Textarea
                  value={form.parts}
                  onChange={set('parts')}
                  placeholder="Например: передние тормозные колодки, масляный фильтр"
                  className="mt-1.5 min-h-[90px]"
                />
              </div>
              <Button
                type="submit"
                className="font-head uppercase tracking-wide font-bold h-12 mt-1"
              >
                Подобрать запчасти
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Нажимая кнопку, вы соглашаетесь на обработку данных.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default VinForm;
