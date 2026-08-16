import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CityInput from "@/components/shared/CityInput";
import PhotoAttach from "@/components/site/PhotoAttach";
import { setStoredCity } from "@/lib/garage-city";
import { normalizePhoneInput } from "@/lib/phone";
import { sanitizeVinInput, getVinLengthHint } from "@/lib/vin";
import { sanitizeNameInput } from "@/lib/name";
import { sanitizePartsInput } from "@/lib/text";
import { messengers, GarageCar } from "./RequestContext";

type FormState = {
  vin: string;
  name: string;
  phone: string;
  parts: string;
  city: string;
  promoCode: string;
};

type RequestFormFieldsProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  messenger: string | null;
  setMessenger: React.Dispatch<React.SetStateAction<string | null>>;
  knownContact: boolean;
  vinHistory: string[];
  garageCars: GarageCar[];
  vinSource: "garage" | "manual" | null;
  setVinSource: React.Dispatch<
    React.SetStateAction<"garage" | "manual" | null>
  >;
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
}: RequestFormFieldsProps) => {
  const setPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({
      ...f,
      phone: normalizePhoneInput(f.phone, e.target.value),
    }));
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
              value={
                vinSource === "garage" &&
                garageCars.some((c) => c.vin === form.vin)
                  ? form.vin
                  : ""
              }
              onValueChange={(vin) => {
                setForm((f) => ({ ...f, vin }));
                setVinSource("garage");
              }}
              disabled={vinSource === "manual"}
            >
              <SelectTrigger
                className={`bg-background ${vinSource === "garage" ? "pr-9" : ""}`}
              >
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
            {vinSource === "garage" && (
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, vin: "" }));
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
            VIN или Frame
            {vinPhotos.length > 0 || partsPhotos.length > 0
              ? " (необязательно)"
              : ""}
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
              const value = sanitizeVinInput(e.target.value)
                .replace(/-/g, "")
                .slice(0, 17);
              setForm((f) => ({ ...f, vin: value }));
              setVinSource(value ? "manual" : null);
            }}
            maxLength={17}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="• • • • • •"
            className={`tracking-[0.14em] uppercase bg-background ${form.vin ? "pr-9" : ""}`}
            list="vin-history-list"
            disabled={vinSource === "garage"}
          />
          {form.vin && (
            <button
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, vin: "" }));
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
        {errors.vin ? (
          <p className="text-primary text-xs mt-1">{errors.vin}</p>
        ) : (
          getVinLengthHint(form.vin) && (
            <p className="text-muted-foreground text-xs mt-1">
              {getVinLengthHint(form.vin)}
            </p>
          )
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
          </div>
          <div>
            <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
              Имя
            </label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: sanitizeNameInput(e.target.value),
                }))
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
              onClick={() =>
                setMessenger((cur) => (cur === m.id ? null : m.id))
              }
              className={`relative flex items-center justify-center gap-2 h-11 rounded-sm border text-sm transition-colors ${
                messenger === m.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-steel text-muted-foreground hover:border-primary/60"
              }`}
            >
              <Icon name={m.icon} size={16} />
              {m.label}
              {messenger === m.id && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Icon
                    name="Check"
                    size={12}
                    className="text-primary-foreground"
                  />
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
          <PhotoAttach
            photos={partsPhotos}
            photoPreviews={partsPhotoPreviews}
            onAdd={addPartsPhotos}
            onRemove={removePartsPhoto}
            compact
          />
        </div>
        <Textarea
          value={form.parts}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              parts: sanitizePartsInput(e.target.value),
            }))
          }
          onFocus={(e) => {
            const target = e.currentTarget;
            setTimeout(() => {
              target.scrollIntoView({ behavior: "smooth", block: "center" });
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
              errors.city
                ? "border-primary text-primary"
                : "border-steel text-foreground"
            }`}
          />
        </div>
        {errors.city && (
          <p className="text-primary text-xs mt-1">{errors.city}</p>
        )}
      </div>

      {!knownContact && (
        <div>
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Промокод друга (необязательно)
          </label>
          <Input
            value={form.promoCode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                promoCode: e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 10),
              }))
            }
            maxLength={10}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="Например, X7K9QZ"
            className="mt-1.5 bg-background tracking-[0.14em] uppercase"
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="font-head uppercase tracking-wide font-bold h-12"
      >
        {submitting ? "Отправляем…" : "Отправить заявку"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Нажимая кнопку, вы соглашаетесь на обработку данных.
      </p>
    </form>
  );
};

export default RequestFormFields;
