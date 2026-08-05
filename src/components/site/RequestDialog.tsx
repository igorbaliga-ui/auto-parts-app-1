import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubmitLead } from '@/hooks/use-submit-lead';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGarageAuth } from '@/hooks/use-garage-auth';
import { preparePhotoForUpload } from '@/lib/image';

type Ctx = {
  open: (vin?: string, photo?: File | null, phone?: string, name?: string, vinHistory?: string[], city?: string) => void;
};

const isValidName = (name?: string) => !!name && name.trim().length >= 2;
const isValidPhone = (phone?: string) => !!phone && phone.replace(/\D/g, '').length >= 10;

const RequestContext = createContext<Ctx>({ open: () => {} });

export const useRequest = () => useContext(RequestContext);

const messengers = [
  { id: 'telegram', label: 'Telegram', icon: 'Send' },
  { id: 'max', label: 'MAX', icon: 'MessageSquare' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
] as const;

const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';

const STORAGE_KEY = 'zapoptom_request_draft';

const emptyForm = { vin: '', name: '', phone: '', parts: '', city: '' };

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { form: typeof emptyForm; messenger: string | null };
  } catch {
    return null;
  }
};

type GarageCar = { vin: string; car_name: string };

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const { authed: garageAuthed, phone: garagePhone } = useGarageAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [messenger, setMessenger] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [knownContact, setKnownContact] = useState(false);
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const [garageCars, setGarageCars] = useState<GarageCar[]>([]);
  const [vinSource, setVinSource] = useState<'garage' | 'manual' | null>(null);
  const nameLookupTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastLookupPhone = useRef<string>('');

  // Клиент вошёл в «Гараж» — подгружаем список его автомобилей с названиями (привязаны к VIN)
  useEffect(() => {
    if (!garageAuthed || !garagePhone) {
      setGarageCars([]);
      return;
    }
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(garagePhone)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const orders: { vin: string | null; car_name: string | null }[] = data.orders || [];
        const seen = new Set<string>();
        const cars: GarageCar[] = [];
        orders.forEach((o) => {
          if (o.vin && o.car_name && !seen.has(o.vin)) {
            seen.add(o.vin);
            cars.push({ vin: o.vin, car_name: o.car_name });
          }
        });
        setGarageCars(cars);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [garageAuthed, garagePhone]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm(draft.form);
      setMessenger(draft.messenger);
    }
  }, []);

  useEffect(() => {
    const hasData = form.vin || form.name || form.phone || form.parts || messenger;
    if (hasData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, messenger }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [form, messenger]);

  // Телефон привязан к одному имени: при вводе известного номера имя подставляется автоматически
  useEffect(() => {
    if (knownContact) return;
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10) return;
    if (lastLookupPhone.current === digits) return;

    clearTimeout(nameLookupTimer.current);
    nameLookupTimer.current = setTimeout(async () => {
      lastLookupPhone.current = digits;
      try {
        const res = await fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(digits)}`);
        if (!res.ok) return;
        const data = await res.json();
        const foundName = data.orders?.[0]?.name;
        if (foundName) {
          setForm((f) => (f.phone.replace(/\D/g, '') === digits ? { ...f, name: foundName } : f));
        }
      } catch {
        // тихо игнорируем — это необязательная подсказка
      }
    }, 500);

    return () => clearTimeout(nameLookupTimer.current);
  }, [form.phone, knownContact]);

  const open = (vin?: string, incomingPhoto?: File | null, phone?: string, name?: string, history?: string[], city?: string) => {
    setSent(false);
    setErrors({});
    setForm((f) => ({
      ...f,
      vin: vin ?? f.vin,
      phone: phone ?? f.phone,
      name: name ?? f.name,
      city: city ?? f.city,
    }));
    setKnownContact(isValidName(name) && isValidPhone(phone));
    setVinHistory(history ?? []);
    setVinSource(vin ? 'manual' : null);
    if (incomingPhoto) {
      setPhoto(incomingPhoto);
      setPhotoPreview(URL.createObjectURL(incomingPhoto));
    }
    setIsOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const vin = form.vin.trim();
    const vinValid = vin.length >= 11 && vin.length <= 17;
    if (!vinValid && !photo) {
      e.vin = 'Укажите VIN или прикрепите фото СТС';
    }
    if (!knownContact && form.name.trim().length < 2) {
      e.name = 'Укажите имя';
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!knownContact && phoneDigits.length < 10) {
      e.phone = 'Укажите корректный телефон';
    }
    if (!messenger) {
      e.messenger = 'Выберите мессенджер';
    }
    if (form.parts.trim().length < 2) {
      e.parts = 'Укажите интересующие запчасти';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const { submitLead, submitting } = useSubmitLead(() => {
    setSent(true);
    setForm(emptyForm);
    setMessenger(null);
    setKnownContact(false);
    setVinSource(null);
    removePhoto();
    localStorage.removeItem(STORAGE_KEY);
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const photoBase64 = photo ? await preparePhotoForUpload(photo) : null;
    submitLead({
      vin: form.vin,
      name: form.name,
      phone: form.phone,
      parts: form.parts,
      city: form.city,
      messenger,
      photo: photoBase64,
    });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const successContent = (
    <div className="py-8 text-center flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
        <Icon name="Check" className="text-primary" size={30} />
      </div>
      <h3 className="font-head uppercase tracking-wide text-2xl">
        Заявка отправлена
      </h3>
      <p className="text-muted-foreground max-w-[30ch]">
        Спасибо! Подберём деталь по VIN и перезвоним в течение 15 минут.
      </p>
      <Button
        variant="secondary"
        className="mt-2 font-head uppercase tracking-wide"
        onClick={() => setIsOpen(false)}
      >
        Закрыть
      </Button>
    </div>
  );

  const formContent = (
    <form onSubmit={submit} className="flex flex-col gap-4 mt-2">
      {garageCars.length > 0 && (
        <div>
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Ваш автомобиль
          </label>
          <div className="relative mt-1.5">
            <Select
              value={vinSource === 'garage' && garageCars.some((c) => c.vin === form.vin) ? form.vin : ''}
              onValueChange={(vin) => {
                setForm((f) => ({ ...f, vin }));
                setVinSource('garage');
              }}
              disabled={vinSource === 'manual'}
            >
              <SelectTrigger className={`bg-background ${vinSource === 'garage' ? 'pr-9' : ''}`}>
                <SelectValue placeholder="Выберите из гаража или введите VIN ниже" />
              </SelectTrigger>
              <SelectContent>
                {garageCars.map((c) => (
                  <SelectItem key={c.vin} value={c.vin}>
                    {c.car_name} — {c.vin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vinSource === 'garage' && (
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, vin: '' }));
                  setVinSource(null);
                }}
                aria-label="Сбросить выбор автомобиля"
                title="Сбросить выбор"
                className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
          VIN-код {photo && <span className="normal-case text-muted-foreground/70">(необязательно, есть фото)</span>}
        </label>
        <div className="relative mt-1.5">
          <Input
            value={form.vin}
            onChange={(e) => {
              set('vin')(e);
              setVinSource(e.target.value ? 'manual' : null);
            }}
            maxLength={17}
            placeholder="XW8ZZZ• • • • • • •"
            className={`tracking-[0.14em] uppercase bg-background ${form.vin ? 'pr-9' : ''}`}
            list="vin-history-list"
            disabled={vinSource === 'garage'}
          />
          {form.vin && (
            <button
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, vin: '' }));
                setVinSource(null);
              }}
              aria-label="Очистить VIN"
              title="Очистить"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        {vinHistory.length > 0 && (
          <datalist id="vin-history-list">
            {vinHistory.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
        {errors.vin && (
          <p className="text-primary text-xs mt-1">{errors.vin}</p>
        )}
      </div>

      {!knownContact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      )}

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
        {errors.messenger && (
          <p className="text-primary text-xs mt-1">{errors.messenger}</p>
        )}
      </div>

      <div>
        <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
          Интересующие запчасти
        </label>
        <Textarea
          value={form.parts}
          onChange={set('parts')}
          onFocus={(e) => {
            const target = e.currentTarget;
            setTimeout(() => {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }}
          placeholder="Например: передние тормозные колодки, масляный фильтр"
          className="mt-1.5 bg-background min-h-[84px]"
        />
        {errors.parts && (
          <p className="text-primary text-xs mt-1">{errors.parts}</p>
        )}
      </div>

      <div>
        <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
          Фото СТС (необязательно)
        </label>
        {photoPreview ? (
          <div className="mt-1.5 relative w-fit">
            <img
              src={photoPreview}
              alt="Фото СТС"
              className="h-20 w-20 object-cover rounded-sm border border-steel"
            />
            <button
              type="button"
              onClick={removePhoto}
              aria-label="Удалить фото"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
            >
              <Icon name="X" size={12} className="text-primary-foreground" />
            </button>
          </div>
        ) : (
          <label className="mt-1.5 flex items-center gap-2 h-11 px-4 w-fit rounded-sm border border-steel text-muted-foreground text-sm cursor-pointer hover:border-primary/60 transition-colors">
            <Icon name="Camera" size={16} />
            Прикрепить фото
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="font-head uppercase tracking-wide font-bold h-12"
      >
        {submitting ? 'Отправляем…' : 'Отправить заявку'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Нажимая кнопку, вы соглашаетесь на обработку данных.
      </p>
    </form>
  );

  if (isMobile) {
    return (
      <RequestContext.Provider value={{ open }}>
        {children}
        <Drawer open={isOpen} onOpenChange={setIsOpen} repositionInputs={false}>
          <DrawerContent className="bg-card border-border max-h-[85vh]">
            <div className="overflow-y-auto px-4 pb-6">
              {sent ? (
                successContent
              ) : (
                <>
                  <DrawerHeader className="px-0 text-left">
                    <DrawerTitle className="font-head uppercase tracking-wide text-2xl">
                      Заявка на подбор
                    </DrawerTitle>
                    <DrawerDescription className="text-muted-foreground">
                      Оставьте VIN и контакты — найдём деталь и сообщим цену.
                    </DrawerDescription>
                  </DrawerHeader>
                  {formContent}
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </RequestContext.Provider>
    );
  }

  return (
    <RequestContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[460px]">
          {sent ? (
            successContent
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
              {formContent}
            </>
          )}
        </DialogContent>
      </Dialog>
    </RequestContext.Provider>
  );
};

export default RequestProvider;