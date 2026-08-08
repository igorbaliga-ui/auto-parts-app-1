import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CityInput from "@/components/shared/CityInput";
import { setStoredCity } from "@/lib/garage-city";

type GarageHeaderProps = {
  city: string;
  setCity: (v: string) => void;
  onNewRequest: () => void;
  openPasswordSettings: () => void;
  setLogoutConfirmOpen: (v: boolean) => void;
  passwordSettingsOpen: boolean;
  setPasswordSettingsOpen: (v: boolean) => void;
  hasPassword: boolean;
  savePasswordSettings: (e: React.FormEvent) => void;
  oldPasswordInput: string;
  setOldPasswordInput: (v: string) => void;
  newPasswordInput: string;
  setNewPasswordInput: (v: string) => void;
  newPasswordConfirmInput: string;
  setNewPasswordConfirmInput: (v: string) => void;
  passwordSettingsError: string;
  passwordSettingsSuccess: string;
  passwordSettingsLoading: boolean;
  removePasswordSettings: () => void;
  logoutConfirmOpen: boolean;
  logout: () => void;
  onOpenLoginHistory: () => void;
};

const GarageHeader = ({
  city,
  setCity,
  onNewRequest,
  openPasswordSettings,
  setLogoutConfirmOpen,
  passwordSettingsOpen,
  setPasswordSettingsOpen,
  hasPassword,
  savePasswordSettings,
  oldPasswordInput,
  setOldPasswordInput,
  newPasswordInput,
  setNewPasswordInput,
  newPasswordConfirmInput,
  setNewPasswordConfirmInput,
  passwordSettingsError,
  passwordSettingsSuccess,
  passwordSettingsLoading,
  removePasswordSettings,
  logoutConfirmOpen,
  logout,
  onOpenLoginHistory,
}: GarageHeaderProps) => {
  return (
    <>
      <div className="flex items-center justify-between mb-5 sm:mb-2 gap-2">
        <Link
          to="/"
          className="sm:hidden flex items-center gap-2 text-muted-foreground text-sm font-head uppercase tracking-wide hover:text-primary transition-colors w-fit"
        >
          <Icon name="ArrowLeft" size={16} />
          На главную
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            aria-label="На главную"
            title="На главную"
            className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-sm bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors"
          >
            <Icon name="Warehouse" className="text-primary" size={20} />
          </Link>
          <h1 className="font-head uppercase tracking-wide text-xl sm:text-2xl whitespace-nowrap">
            Мой гараж
          </h1>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 w-full max-w-[220px] ml-auto sm:ml-0 sm:mr-auto">
        <CityInput
          value={city}
          onChange={(v) => {
            setCity(v);
            setStoredCity(v);
          }}
          className="h-9 text-xs sm:text-sm bg-transparent border-0 rounded-none px-0 shadow-none text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-right sm:text-left"
        />
      </div>

      <div className="flex items-center justify-end mb-6 sm:mb-2 gap-2">
        <Link
          to="/"
          className="hidden sm:flex items-center justify-center h-10 px-4 rounded-sm border border-steel text-muted-foreground text-sm font-head uppercase tracking-wide hover:border-primary/60 hover:text-foreground transition-colors"
        >
          <Icon name="ArrowLeft" size={16} className="mr-2" />
          На главную
        </Link>
        <Button
          onClick={onNewRequest}
          className="font-head uppercase tracking-wide text-sm h-10 px-4 flex-1 sm:flex-initial whitespace-nowrap"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Новая заявка
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={openPasswordSettings}
          className="relative h-10 w-10 shrink-0"
          title={
            hasPassword
              ? "Пароль для входа"
              : "Пароль не задан — защитите доступ к заказам"
          }
        >
          <Icon name="Lock" size={16} />
          {!hasPassword && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-primary" />
            </span>
          )}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onOpenLoginHistory}
          className="h-10 w-10 shrink-0"
          title="История входов"
        >
          <Icon name="History" size={16} />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setLogoutConfirmOpen(true)}
          className="h-10 w-10 shrink-0"
          title="Выйти"
        >
          <Icon name="LogOut" size={16} />
        </Button>
      </div>

      <Dialog
        open={passwordSettingsOpen}
        onOpenChange={setPasswordSettingsOpen}
      >
        <DialogContent className="bg-card border-border sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide text-xl">
              {hasPassword ? "Пароль для входа" : "Задать пароль"}
            </DialogTitle>
            <DialogDescription>
              {hasPassword
                ? "Пароль защищает доступ к вашим заказам по этому номеру телефона."
                : "РЕКОМЕНДУЕМ: задайте пароль, чтобы дополнительно защитить доступ к заказам."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={savePasswordSettings}
            className="flex flex-col gap-3 mt-1"
          >
            {hasPassword && (
              <div>
                <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  Текущий пароль
                </label>
                <Input
                  type="password"
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  maxLength={4}
                  placeholder="Текущий пароль"
                  className="mt-1.5 bg-background"
                />
              </div>
            )}
            <div>
              <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                {hasPassword ? "Новый пароль" : "Пароль"}
              </label>
              <Input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                maxLength={4}
                placeholder="4 символа"
                className="mt-1.5 bg-background"
              />
            </div>
            <div>
              <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                Повторите пароль
              </label>
              <Input
                type="password"
                value={newPasswordConfirmInput}
                onChange={(e) => setNewPasswordConfirmInput(e.target.value)}
                maxLength={4}
                placeholder="4 символа"
                className="mt-1.5 bg-background"
              />
            </div>
            {passwordSettingsError && (
              <p className="text-primary text-sm">{passwordSettingsError}</p>
            )}
            {passwordSettingsSuccess && (
              <p className="text-primary text-sm">{passwordSettingsSuccess}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="submit"
                disabled={passwordSettingsLoading}
                className="font-head uppercase tracking-wide flex-1"
              >
                {passwordSettingsLoading
                  ? "Сохраняем…"
                  : hasPassword
                    ? "Сменить пароль"
                    : "Сохранить"}
              </Button>
              {hasPassword && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={passwordSettingsLoading}
                  onClick={removePasswordSettings}
                  className="font-head uppercase tracking-wide"
                >
                  Убрать пароль
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-head uppercase tracking-wide">
              Выйти из гаража?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вам нужно будет заново ввести номер телефона, чтобы снова увидеть
              свои заказы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-head uppercase tracking-wide">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="font-head uppercase tracking-wide"
            >
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GarageHeader;