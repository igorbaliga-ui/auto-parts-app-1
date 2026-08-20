import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import PhotoAttach from '@/components/site/PhotoAttach';
import { sanitizeVinInput, getVinLengthHint } from '@/lib/vin';
import { GarageCar } from './RequestContext';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string; promoCode: string };

type RequestCarVinFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  garageCars: GarageCar[];
  vinSource: 'garage' | 'manual' | null;
  setVinSource: React.Dispatch<React.SetStateAction<'garage' | 'manual' | null>>;
  vinHistory: string[];
  vinPhotos: File[];
  vinPhotoPreviews: string[];
  addVinPhotos: (files: File[]) => void;
  removeVinPhoto: (index: number) => void;
  showSignupBonusHint?: boolean;
  signupBonusAmount?: number;
  vinOptionalHint: boolean;
};

const RequestCarVinFields = ({
  form,
  setForm,
  errors,
  garageCars,
  vinSource,
  setVinSource,
  vinHistory,
  vinPhotos,
  vinPhotoPreviews,
  addVinPhotos,
  removeVinPhoto,
  showSignupBonusHint,
  signupBonusAmount,
  vinOptionalHint,
}: RequestCarVinFieldsProps) => {
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
    <>
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
            VIN или Frame{vinOptionalHint ? ' (необязательно)' : ''}
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
    </>
  );
};

export default RequestCarVinFields;
