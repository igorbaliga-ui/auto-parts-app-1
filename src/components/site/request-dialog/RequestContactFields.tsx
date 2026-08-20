import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { normalizePhoneInput } from '@/lib/phone';
import { sanitizeNameInput } from '@/lib/name';
import { messengers } from './RequestContext';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string; promoCode: string };

type RequestContactFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  nameAutoFilled?: boolean;
  messenger: string | null;
  setMessenger: React.Dispatch<React.SetStateAction<string | null>>;
  knownContact: boolean;
};

const RequestContactFields = ({
  form,
  setForm,
  errors,
  nameAutoFilled,
  messenger,
  setMessenger,
  knownContact,
}: RequestContactFieldsProps) => {
  const setPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, phone: normalizePhoneInput(f.phone, e.target.value) }));
  };

  return (
    <>
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
    </>
  );
};

export default RequestContactFields;
