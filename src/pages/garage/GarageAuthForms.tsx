import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import PageBackground from "@/components/site/PageBackground";
import { normalizePhoneInput } from "@/lib/phone";
import { sanitizeVinInput } from "@/lib/vin";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SUPPORT_PHONE = "+79324027937";

const SupportHint = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label="Не получается восстановить доступ?"
        title="Не получается восстановить доступ?"
        className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
      >
        <Icon name="HelpCircle" size={15} />
      </button>
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="end"
      className="w-64 text-sm bg-card border-steel"
    >
      Обратитесь к менеджеру по телефону{" "}
      <a href={`tel:${SUPPORT_PHONE}`} className="text-primary whitespace-nowrap">
        {SUPPORT_PHONE}
      </a>
    </PopoverContent>
  </Popover>
);

type CheckingSavedViewProps = Record<string, never>;

export const CheckingSavedView = (_props: CheckingSavedViewProps) => (
  <PageBackground>
    <div className="min-h-screen flex items-center justify-center px-5">
      <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center animate-pulse">
        <Icon name="Warehouse" className="text-primary" size={28} />
      </span>
    </div>
  </PageBackground>
);

type CallVerificationViewProps = {
  phone: string;
  callRequested: boolean;
  callLoading: boolean;
  codeInput: string;
  setCodeInput: (v: string) => void;
  error: string;
  verifyLoading: boolean;
  cooldown: number;
  requestCall: () => void;
  submitCode: (e: React.FormEvent) => void;
  backToPhone: () => void;
};

export const CallVerificationView = ({
  phone,
  callRequested,
  callLoading,
  codeInput,
  setCodeInput,
  error,
  verifyLoading,
  cooldown,
  requestCall,
  submitCode,
  backToPhone,
}: CallVerificationViewProps) => (
  <PageBackground>
    <div className="min-h-screen flex items-center justify-center px-5">
      <form
        onSubmit={submitCode}
        className="relative w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4 animate-fade-in"
      >
        <SupportHint />
        <div className="flex justify-center mb-2">
          <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
            <Icon name="PhoneCall" className="text-primary" size={28} />
          </span>
        </div>
        <h1 className="font-head uppercase tracking-wide text-2xl text-center">
          Подтверждение номера
        </h1>
        {!callRequested ? (
          <p className="text-muted-foreground text-sm text-center">
            Первый вход с номера {phone}. Нажмите кнопку — мы позвоним, и вам
            нужно будет ввести последние 4 цифры номера, с которого поступит звонок.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm text-center">
            Ждите звонка на номер {phone} и введите последние 4 цифры номера звонившего.
          </p>
        )}
        {callRequested && (
          <Input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            inputMode="numeric"
            placeholder="0000"
            className="text-center tracking-[0.4em] text-lg"
            autoFocus
          />
        )}
        {error && <p className="text-primary text-sm text-center">{error}</p>}
        {!callRequested ? (
          <Button
            type="button"
            onClick={requestCall}
            disabled={callLoading}
            className="font-head uppercase tracking-wide h-11"
          >
            {callLoading ? "Звоним…" : "Позвонить мне"}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={verifyLoading || codeInput.length !== 4}
            className="font-head uppercase tracking-wide h-11"
          >
            {verifyLoading ? "Проверяем…" : "Подтвердить"}
          </Button>
        )}
        {callRequested && (
          <button
            type="button"
            onClick={requestCall}
            disabled={cooldown > 0 || callLoading}
            className="text-center text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Повторный звонок через ${cooldown} с` : "Позвонить ещё раз"}
          </button>
        )}
        <button
          type="button"
          onClick={backToPhone}
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ввести другой номер
        </button>
      </form>
    </div>
  </PageBackground>
);

type ResetPasswordViewProps = {
  phone: string;
  resetVinInput: string;
  setResetVinInput: (v: string) => void;
  resetPasswordInput: string;
  setResetPasswordInput: (v: string) => void;
  resetError: string;
  resetLoading: boolean;
  submitResetPassword: (e: React.FormEvent) => void;
  setResetPasswordMode: (v: boolean) => void;
  setResetError: (v: string) => void;
};

export const ResetPasswordView = ({
  phone,
  resetVinInput,
  setResetVinInput,
  resetPasswordInput,
  setResetPasswordInput,
  resetError,
  resetLoading,
  submitResetPassword,
  setResetPasswordMode,
  setResetError,
}: ResetPasswordViewProps) => (
  <PageBackground>
    <div className="min-h-screen flex items-center justify-center px-5">
      <form
        onSubmit={submitResetPassword}
        className="relative w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4 animate-fade-in"
      >
        <SupportHint />
        <div className="flex justify-center mb-2">
          <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
            <Icon name="KeyRound" className="text-primary" size={28} />
          </span>
        </div>
        <h1 className="font-head uppercase tracking-wide text-2xl text-center">
          Восстановление пароля
        </h1>
        <p className="text-muted-foreground text-sm text-center">
          Введите VIN любого автомобиля из заявок с номера {phone},
          и задайте новый пароль.
        </p>
        <Input
          value={resetVinInput}
          onChange={(e) => setResetVinInput(sanitizeVinInput(e.target.value))}
          maxLength={20}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="VIN автомобиля"
          className="uppercase tracking-[0.14em]"
          autoFocus
        />
        <Input
          type="password"
          value={resetPasswordInput}
          onChange={(e) => setResetPasswordInput(e.target.value)}
          maxLength={4}
          placeholder="Новый пароль (4 символа)"
        />
        {resetError && (
          <p className="text-primary text-sm text-center">{resetError}</p>
        )}
        <Button
          type="submit"
          disabled={resetLoading}
          className="font-head uppercase tracking-wide h-11"
        >
          {resetLoading ? "Сохраняем…" : "Сохранить и войти"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setResetPasswordMode(false);
            setResetVinInput("");
            setResetPasswordInput("");
            setResetError("");
          }}
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Назад к вводу пароля
        </button>
      </form>
    </div>
  </PageBackground>
);

type PasswordRequiredViewProps = {
  phone: string;
  submitPassword: (e: React.FormEvent) => void;
  passwordInput: string;
  setPasswordInput: (v: string) => void;
  error: string;
  loading: boolean;
  setResetPasswordMode: (v: boolean) => void;
  setResetError: (v: string) => void;
  setPasswordRequired: (v: boolean) => void;
  setError: (v: string) => void;
};

export const PasswordRequiredView = ({
  phone,
  submitPassword,
  passwordInput,
  setPasswordInput,
  error,
  loading,
  setResetPasswordMode,
  setResetError,
  setPasswordRequired,
  setError,
}: PasswordRequiredViewProps) => (
  <PageBackground>
    <div className="min-h-screen flex items-center justify-center px-5">
      <form
        onSubmit={submitPassword}
        className="w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4 animate-fade-in"
      >
        <div className="flex justify-center mb-2">
          <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
            <Icon name="Lock" className="text-primary" size={28} />
          </span>
        </div>
        <h1 className="font-head uppercase tracking-wide text-2xl text-center">
          Введите пароль
        </h1>
        <p className="text-muted-foreground text-sm text-center">
          Для номера {phone} задан пароль. Введите его, чтобы войти в гараж.
        </p>
        <Input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          maxLength={4}
          placeholder="Пароль"
          autoFocus
        />
        {error && <p className="text-primary text-sm text-center">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="font-head uppercase tracking-wide h-11"
        >
          {loading ? "Входим…" : "Войти"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setResetPasswordMode(true);
            setResetError("");
          }}
          className="text-center text-xs text-primary hover:underline"
        >
          Забыли пароль?
        </button>
        <button
          type="button"
          onClick={() => {
            setPasswordRequired(false);
            setPasswordInput("");
            setError("");
          }}
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ввести другой номер
        </button>
      </form>
    </div>
  </PageBackground>
);

type PhoneEntryViewProps = {
  submit: (e: React.FormEvent) => void;
  phone: string;
  setPhone: (v: string) => void;
  error: string;
  loading: boolean;
  checkingPassword: boolean;
  onNewRequest: () => void;
};

const NO_ORDERS_ERROR = 'По этому номеру заявок не найдено. Оставьте заявку, чтобы получить доступ в гараж.';

export const PhoneEntryView = ({
  submit,
  phone,
  setPhone,
  error,
  loading,
  checkingPassword,
  onNewRequest,
}: PhoneEntryViewProps) => (
  <PageBackground>
    <div className="min-h-screen flex items-center justify-center px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4 animate-fade-in"
      >
        <div className="flex justify-center mb-2">
          <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
            <Icon name="Warehouse" className="text-primary" size={28} />
          </span>
        </div>
        <h1 className="font-head uppercase tracking-wide text-2xl text-center">
          Гараж
        </h1>
        <p className="text-muted-foreground text-sm text-center">
          Введите телефон, который указывали в заявке — покажем ваши заказы.
        </p>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(normalizePhoneInput(phone, e.target.value))}
          maxLength={12}
          placeholder="+7 900 000-00-00"
          autoFocus
        />
        {error && error !== NO_ORDERS_ERROR && (
          <p className="text-primary text-sm text-center">{error}</p>
        )}
        {error === NO_ORDERS_ERROR && (
          <div className="text-center">
            <p className="text-primary text-sm">По этому номеру заявок не найдено.</p>
            <button
              type="button"
              onClick={onNewRequest}
              className="font-head uppercase tracking-wide text-2xl text-primary hover:underline mt-1"
            >
              Оставьте заявку
            </button>
          </div>
        )}
        <Button
          type="submit"
          disabled={loading || checkingPassword}
          className="font-head uppercase tracking-wide h-11"
        >
          {loading || checkingPassword ? "Загружаем…" : "Войти"}
        </Button>
        <Link
          to="/"
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          На главную
        </Link>
      </form>
    </div>
  </PageBackground>
);