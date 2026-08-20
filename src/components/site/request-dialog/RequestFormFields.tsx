import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import CityInput from '@/components/shared/CityInput';
import PhotoAttach from '@/components/site/PhotoAttach';
import { setStoredCity } from '@/lib/garage-city';
import { normalizePhoneInput } from '@/lib/phone';
import { sanitizeVinInput, getVinLengthHint } from '@/lib/vin';
import { sanitizeNameInput } from '@/lib/name';
import { sanitizePartsInput } from '@/lib/text';
import { messengers, GarageCar } from './RequestContext';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string; promoCode: string };

type PromoStatus = 'idle' | 'checking' | 'valid' | 'invalid';

type RequestFormFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  promoStatus?: PromoStatus;
  promoAlreadyUsed?: boolean;
  nameAutoFilled?: boolean;
  messenger: string | null;
  setMessenger: React.Dispatch<React.SetStateAction<string | null>>;
  knownContact: boolean;
  vinHistory: string[];
  garageCars: GarageCar[];
  vinSource: 'garage' | 'manual' | null;
  setVinSource: React.Dispatch<React.SetStateAction<'garage' | 'manual' | null>>;
  vinPhotos: File[];
  vinPhotoPreviews: string[];
  addVinPhotos: (files: File[]) => void;
  removeVinPhoto: (index: number) => void;
  partsPhotos: File[];
  partsPhotoPreviews: string[];
  addPartsPhotos: (files: File[]) => void;
  removePartsPhoto: (index: number) => void;
  submitting: boolean;
  onSubmit: (ev: React.FormEvent) => void;
  showSignupBonusHint?: boolean;
  signupBonusAmount?: number;
};

const RequestFormFields = ({
  form,
  setForm,
  errors,
  promoStatus = 'idle',
  promoAlreadyUsed,
  nameAutoFilled,
  messenger,
  setMessenger,
  knownContact,
  vinHistory,
  garageCars,
  vinSource,
  setVinSource,
  vinPhotos,
  vinPhotoPreviews,
  addVinPhotos,
  removeVinPhoto,
  partsPhotos,
  partsPhotoPreviews,
  addPartsPhotos,
  removePartsPhoto,
  submitting,
  onSubmit,
  showSignupBonusHint,
  signupBonusAmount,
}: RequestFormFieldsProps) => {
  const setPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, phone: normalizePhoneInput(f.phone, e.target.value) }));
  };
  const [partsExpanded, setPartsExpanded] = useState(false);
  const [carPickerOpen, setCarPickerOpen] = useState(false);
  const carPickerRef = useRef<HTMLDivElement>(null);

  // Свой выпадающий список вместо Radix Select: тот открывался ВНУТРИ диалога
  // заявки и на части Android-браузеров (в т.ч. Samsung Internet) после выбора
  // машины из списка не до конца снимал внутреннюю блокировку клика по фону —
  // диалог визуально закрывался, а страница переставала реагировать на touch,
  // выглядело как зависание с чёрным экраном, помогал только перезапуск.
  useEffect(() => {
    if (!carPickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (carPickerRef.current && !carPickerRef.current.contains(e.target as Node)) {
        setCarPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [carPickerOpen]);

  const selectedCar =
    vinSource === 'garage' ? garageCars.find((c) => c.vin === form.vin) : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
      {showSignupBonusHint && signupBonusAmount ? (
        <div className="flex items-center gap-2 rounded-sm border border-green-600/40 bg-green-600/10 px-3 py-2 text-xs text-green-600 dark:text-green-500">
          <Icon name="Gift" size={15} className="shrink-0" />
          За первую заявку начислим дополнительно {signupBonusAmount % 1 === 0 ? signupBonusAmount : signupBonusAmount.toFixed(2)} бонусов
        </div>
      ) : null}
      {garageCars.length > 0 && (
        <div>
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Ваш автомобиль
          </label>
          <div className="relative mt-1.5" ref={carPickerRef}>
            <button
              type="button"
              onClick={() => vinSource !== 'manual' && setCarPickerOpen((v) => !v)}
              disabled={vinSource === 'manual'}
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${vinSource === 'garage' ? 'pr-9' : ''}`}
            >
              <span className={`truncate text-left ${selectedCar ? '' : 'text-muted-foreground'}`}>
                {selectedCar ? `${selectedCar.car_name} — ${selectedCar.vin}` : 'Выберите из гаража или введите VIN ниже'}
              </span>
              <Icon name="ChevronDown" size={16} className="opacity-50 shrink-0" />
            </button>
            {carPickerOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 w-full bg-popover border border-border rounded-sm shadow-md overflow-hidden max-h-60 overflow-y-auto">
                {garageCars.map((c) => (
                  <button
                    key={c.vin}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, vin: c.vin }));
                      setVinSource('garage');
                      setCarPickerOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors truncate"
                  >
                    {c.car_name} — {c.vin}
                  </button>
                ))}
              </div>
            )}
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
        <div className="flex items-center justify-between gap-3">
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            VIN или Frame{(vinPhotos.length > 0 || partsPhotos.length > 0) ? ' (необязательно)' : ''}
          </label>
          <PhotoAttach
            photos={vinPhotos}
            photoPreviews={vinPhotoPreviews}
            onAdd={addVinPhotos}
            onRemove={removeVinPhoto}
            compact
          />
        </div>
        <div className="relative mt-1.5">
          <Input
            value={form.vin}
            onChange={(e) => {
              const value = sanitizeVinInput(e.target.value).replace(/-/g, '').slice(0, 17);
              setForm((f) => ({ ...f, vin: value }));
              setVinSource(value ? 'manual' : null);
            }}
            maxLength={17}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
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
        <p className="text-xs mt-1 min-h-[1em] leading-none">
          {errors.vin ? (
            <span className="text-primary">{errors.vin}</span>
          ) : (
            getVinLengthHint(form.vin) && (
              <span className="text-muted-foreground">{getVinLengthHint(form.vin)}</span>
            )
          )}
        </p>
      </div>

      {!knownContact && (
        <div className={`grid grid-cols-1 gap-4 transition-[grid-template-columns] duration-300 ${nameAutoFilled ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
          <div>
            <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
              Телефон
            </label>
            <Input
              value={form.phone}
              onChange={setPhone}
              maxLength={12}
              type="tel"
              inputMode="tel"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="+7 900 000-00-00"
              className="mt-1.5 bg-background"
              autoComplete="off"
              name="request-phone"
            />
            {errors.phone && (
              <p className="text-primary text-xs mt-1">{errors.phone}</p>
            )}
            <p
              className={`flex items-center gap-1 text-xs text-primary transition-all duration-300 ease-in-out overflow-hidden ${
                nameAutoFilled ? 'max-h-5 opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'
              }`}
            >
              <Icon name="Sparkles" size={12} />
              С возвращением! Мы вас узнали
            </p>
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              nameAutoFilled ? 'grid-rows-[0fr] opacity-0 -mt-4 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
            } grid`}
            aria-hidden={nameAutoFilled}
          >
            <div className="min-h-0">
              <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                Имя
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: sanitizeNameInput(e.target.value) }))
                }
                maxLength={30}
                inputMode="text"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Как к вам обращаться"
                className="mt-1.5 bg-background"
                autoComplete="off"
                name="request-name"
                tabIndex={nameAutoFilled ? -1 : 0}
              />
              {errors.name && (
                <p className="text-primary text-xs mt-1">{errors.name}</p>
              )}
            </div>
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
        <div className="flex items-center justify-between gap-3">
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Интересующие запчасти
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPartsExpanded(true)}
              title="Открыть на весь экран"
              className="flex items-center justify-center w-7 h-7 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="Maximize2" size={14} />
            </button>
            <PhotoAttach
              photos={partsPhotos}
              photoPreviews={partsPhotoPreviews}
              onAdd={addPartsPhotos}
              onRemove={removePartsPhoto}
              compact
            />
          </div>
        </div>
        <Textarea
          value={form.parts}
          readOnly
          onClick={() => setPartsExpanded(true)}
          onFocus={(e) => {
            e.currentTarget.blur();
            setPartsExpanded(true);
          }}
          placeholder="Например: передние тормозные колодки, масляный фильтр"
          className="mt-1.5 bg-background min-h-[84px] cursor-pointer resize-none"
        />
        <p className="text-muted-foreground text-xs mt-1 text-right">
          {form.parts.length}/1000
        </p>
        {errors.parts && (
          <p className="text-primary text-xs mt-1">{errors.parts}</p>
        )}
      </div>

      <Dialog open={partsExpanded} onOpenChange={setPartsExpanded}>
        <DialogContent className="bg-card border-border sm:max-w-[560px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide text-xl">
              Интересующие запчасти
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Опишите подробно — марку, модель, год, что именно нужно.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={form.parts}
            onChange={(e) =>
              setForm((f) => ({ ...f, parts: sanitizePartsInput(e.target.value) }))
            }
            maxLength={1000}
            placeholder="Например: передние тормозные колодки, масляный фильтр"
            className="bg-background min-h-[45vh] resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {form.parts.length}/1000
            </p>
            <Button
              type="button"
              onClick={() => setPartsExpanded(false)}
              className="font-head uppercase tracking-wide"
            >
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
          Город
        </label>
        <div className="mt-1.5 w-[220px]">
          <CityInput
            value={form.city}
            onChange={(v) => {
              setForm((f) => ({ ...f, city: v }));
              setStoredCity(v);
            }}
            placeholder="Выбрать город"
            className={`h-11 px-4 rounded-sm border text-sm bg-background ${
              errors.city ? 'border-primary text-primary' : 'border-steel text-foreground'
            }`}
          />
        </div>
        {errors.city && (
          <p className="text-primary text-xs mt-1">{errors.city}</p>
        )}
      </div>

      {!knownContact && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            promoAlreadyUsed ? 'grid-rows-[0fr] opacity-0 -mt-4 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
          } grid`}
          aria-hidden={promoAlreadyUsed}
        >
          <div className="min-h-0">
            <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
              Промокод друга (необязательно)
            </label>
            <div className="relative mt-1.5">
              <Input
                value={form.promoCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    promoCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                  }))
                }
                maxLength={10}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                placeholder="Например, X7K9QZ"
                tabIndex={promoAlreadyUsed ? -1 : 0}
                className={`bg-background tracking-[0.14em] uppercase pr-9 ${
                  promoStatus === 'invalid'
                    ? 'border-primary text-primary'
                    : promoStatus === 'valid'
                      ? 'border-green-600'
                      : ''
                }`}
              />
              {form.promoCode && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {promoStatus === 'checking' && (
                    <Icon name="Loader2" size={15} className="animate-spin text-muted-foreground" />
                  )}
                  {promoStatus === 'valid' && (
                    <Icon name="CheckCircle2" size={15} className="text-green-600" />
                  )}
                  {promoStatus === 'invalid' && (
                    <Icon name="XCircle" size={15} className="text-primary" />
                  )}
                </span>
              )}
            </div>
            {promoStatus === 'invalid' && !errors.promoCode ? (
              <p className="text-primary text-xs mt-1">Такого промокода не существует</p>
            ) : promoStatus === 'valid' ? (
              <p className="text-green-600 text-xs mt-1">Промокод действителен</p>
            ) : (
              errors.promoCode && <p className="text-primary text-xs mt-1">{errors.promoCode}</p>
            )}
          </div>
        </div>
      )}

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
};

export default RequestFormFields;