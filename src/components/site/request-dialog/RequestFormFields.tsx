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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cities, setStoredCity } from '@/lib/garage-city';
import { messengers, GarageCar } from './RequestContext';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string };

type RequestFormFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  messenger: string | null;
  setMessenger: React.Dispatch<React.SetStateAction<string | null>>;
  knownContact: boolean;
  vinHistory: string[];
  garageCars: GarageCar[];
  vinSource: 'garage' | 'manual' | null;
  setVinSource: React.Dispatch<React.SetStateAction<'garage' | 'manual' | null>>;
  photoPreview: string | null;
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: () => void;
  submitting: boolean;
  onSubmit: (ev: React.FormEvent) => void;
};

const RequestFormFields = ({
  form,
  setForm,
  errors,
  messenger,
  setMessenger,
  knownContact,
  vinHistory,
  garageCars,
  vinSource,
  setVinSource,
  photoPreview,
  handlePhotoSelect,
  removePhoto,
  submitting,
  onSubmit,
}: RequestFormFieldsProps) => {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
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
        <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">VIN или Frame</label>
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
              maxLength={12}
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
              maxLength={30}
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
          maxLength={1000}
          placeholder="Например: передние тормозные колодки, масляный фильтр"
          className="mt-1.5 bg-background min-h-[84px]"
        />
        <p className="text-muted-foreground text-xs mt-1 text-right">
          {form.parts.length}/1000
        </p>
        {errors.parts && (
          <p className="text-primary text-xs mt-1">{errors.parts}</p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
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

        <div>
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Город
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`mt-1.5 flex items-center gap-2 h-11 px-4 rounded-sm border text-sm transition-colors ${
                  errors.city ? 'border-primary text-primary' : 'border-steel text-muted-foreground hover:border-primary/60'
                }`}
              >
                <Icon name="MapPin" size={16} />
                {form.city || 'Выбрать город'}
                <Icon name="ChevronDown" size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {cities.map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => {
                    setForm((f) => ({ ...f, city: c }));
                    setStoredCity(c);
                  }}
                >
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.city && (
            <p className="text-primary text-xs mt-1">{errors.city}</p>
          )}
        </div>
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
};

export default RequestFormFields;