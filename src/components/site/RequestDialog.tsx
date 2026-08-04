import { createContext, useContext, useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

type Ctx = {
  open: (vin?: string) => void;
};

const RequestContext = createContext<Ctx>({ open: () => {} });

export const useRequest = () => useContext(RequestContext);

const messengers = [
  { id: 'telegram', label: 'Telegram', icon: 'Send' },
  { id: 'max', label: 'MAX', icon: 'MessageSquare' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
] as const;

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    vin: '',
    name: '',
    phone: '',
    parts: '',
  });
  const [messenger, setMessenger] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (vin?: string) => {
    setSent(false);
    setErrors({});
    setForm((f) => ({ ...f, vin: vin ?? f.vin }));
    setMessenger(null);
    setIsOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const vin = form.vin.trim();
    if (vin.length < 11 || vin.length > 17) {
      e.vin = 'VIN содержит от 11 до 17 символов';
    }
    if (form.name.trim().length < 2) {
      e.name = 'Укажите имя';
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      e.phone = 'Укажите корректный телефон';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    // v1: backend отправка подключается позже
    setSent(true);
    toast({
      title: 'Заявка принята',
      description: 'Менеджер свяжется с вами в течение 15 минут.',
    });
    setForm({ vin: '', name: '', phone: '', parts: '' });
    setMessenger(null);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  return (
    <RequestContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[460px]">
          {sent ? (
            <div className="py-8 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                <Icon name="Check" className="text-primary" size={30} />
              </div>
              <DialogTitle className="font-head uppercase tracking-wide text-2xl">
                Заявка отправлена
              </DialogTitle>
              <DialogDescription className="text-muted-foreground max-w-[30ch]">
                Спасибо! Подберём деталь по VIN и перезвоним в течение 15 минут.
              </DialogDescription>
              <Button
                variant="secondary"
                className="mt-2 font-head uppercase tracking-wide"
                onClick={() => setIsOpen(false)}
              >
                Закрыть
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-head uppercase tracking-wide text-2xl">
                  Заявка на подбор
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Оставьте VIN и контакты — найдём деталь и сообщим цену.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={submit} className="flex flex-col gap-4 mt-2">
                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    VIN-код
                  </label>
                  <Input
                    value={form.vin}
                    onChange={set('vin')}
                    maxLength={17}
                    placeholder="XW8ZZZ• • • • • • •"
                    className="mt-1.5 tracking-[0.14em] uppercase bg-background"
                  />
                  {errors.vin && (
                    <p className="text-primary text-xs mt-1">{errors.vin}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                      Имя
                    </label>
                    <Input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Как к вам обращаться"
                      className="mt-1.5 bg-background"
                    />
                    {errors.name && (
                      <p className="text-primary text-xs mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                      Телефон
                    </label>
                    <Input
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+7 900 000-00-00"
                      className="mt-1.5 bg-background"
                    />
                    {errors.phone && (
                      <p className="text-primary text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    Удобный мессенджер
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {messengers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMessenger((cur) => (cur === m.id ? null : m.id))}
                        className={`relative flex items-center justify-center gap-2 h-11 rounded-sm border text-sm transition-colors ${
                          messenger === m.id
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-steel text-muted-foreground hover:border-primary/60'
                        }`}
                      >
                        <Icon name={m.icon} size={16} />
                        {m.label}
                        {messenger === m.id && (
                          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Icon name="Check" size={12} className="text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    ))}
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
                    className="mt-1.5 bg-background min-h-[84px]"
                  />
                </div>

                <Button
                  type="submit"
                  className="font-head uppercase tracking-wide font-bold h-12"
                >
                  Отправить заявку
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Нажимая кнопку, вы соглашаетесь на обработку данных.
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </RequestContext.Provider>
  );
};

export default RequestProvider;