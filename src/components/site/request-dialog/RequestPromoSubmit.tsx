import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

type FormState = {
  vin: string;
  name: string;
  phone: string;
  parts: string;
  city: string;
  promoCode: string;
};

type PromoStatus = "idle" | "checking" | "valid" | "invalid";

type RequestPromoSubmitProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  promoStatus: PromoStatus;
  promoAlreadyUsed?: boolean;
  knownContact: boolean;
  submitting: boolean;
};

const RequestPromoSubmit = ({
  form,
  setForm,
  errors,
  promoStatus,
  promoAlreadyUsed,
  knownContact,
  submitting,
}: RequestPromoSubmitProps) => (
  <>
    {!knownContact && (
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          promoAlreadyUsed
            ? "grid-rows-[0fr] opacity-0 -mt-4 pointer-events-none"
            : "grid-rows-[1fr] opacity-100"
        } grid`}
        aria-hidden={promoAlreadyUsed}
      >
        <div className="min-h-0">
          <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
            Промокод друга (друг будет получать 2% с ваших заказов)
          </label>
          <div className="relative mt-1.5">
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
              tabIndex={promoAlreadyUsed ? -1 : 0}
              className={`bg-background tracking-[0.14em] uppercase pr-9 ${
                promoStatus === "invalid"
                  ? "border-primary text-primary"
                  : promoStatus === "valid"
                    ? "border-green-600"
                    : ""
              }`}
            />
            {form.promoCode && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {promoStatus === "checking" && (
                  <Icon
                    name="Loader2"
                    size={15}
                    className="animate-spin text-muted-foreground"
                  />
                )}
                {promoStatus === "valid" && (
                  <Icon
                    name="CheckCircle2"
                    size={15}
                    className="text-green-600"
                  />
                )}
                {promoStatus === "invalid" && (
                  <Icon name="XCircle" size={15} className="text-primary" />
                )}
              </span>
            )}
          </div>
          {promoStatus === "invalid" && !errors.promoCode ? (
            <p className="text-primary text-xs mt-1">
              Такого промокода не существует
            </p>
          ) : promoStatus === "valid" ? (
            <p className="text-green-600 text-xs mt-1">Промокод действителен</p>
          ) : (
            errors.promoCode && (
              <p className="text-primary text-xs mt-1">{errors.promoCode}</p>
            )
          )}
        </div>
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
  </>
);

export default RequestPromoSubmit;
