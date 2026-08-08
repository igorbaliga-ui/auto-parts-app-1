import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import PageBackground from "@/components/site/PageBackground";
import { normalizePhoneInput } from "@/lib/phone";

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

type ResetPasswordViewProps = {
  phone: string;
  resetNameInput: string;
  setResetNameInput: (v: string) => void;
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
  resetNameInput,
  setResetNameInput,
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
        className="w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4"
      >
        <div className="flex justify-center mb-2">
          <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
            <Icon name="KeyRound" className="text-primary" size={28} />
          </span>
        </div>
        <h1 className="font-head uppercase tracking-wide text-2xl text-center">
          Восстановление пароля
        </h1>
        <p className="text-muted-foreground text-sm text-center">
          Введите имя, которое указывали в самой первой заявке с номера {phone},
          и задайте новый пароль.
        </p>
        <Input
          value={resetNameInput}
          onChange={(e) => setResetNameInput(e.target.value)}
          maxLength={30}
          placeholder="Имя из заявки"
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
            setResetNameInput("");
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
        className="w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4"
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
};

export const PhoneEntryView = ({
  submit,
  phone,
  setPhone,
  error,
  loading,
  checkingPassword,
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
        {error && <p className="text-primary text-sm text-center">{error}</p>}
        <Button
          type="submit"
          disabled={loading || checkingPassword}
          className="font-head uppercase tracking-wide h-11"
        >
          {loading || checkingPassword ? "Загружаем…" : "Войти"}
        </Button>
        <a
          href="/"
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          На главную
        </a>
      </form>
    </div>
  </PageBackground>
);