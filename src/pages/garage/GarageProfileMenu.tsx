import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
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

type GarageProfileMenuProps = {
  knownName?: string;
  phone: string;
  openPhoneChange: () => void;
  city: string;
  setCity: (v: string) => void;
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
};

/**
 * Кнопка «Профиль» в шапке «Гаража»: объединяет то, что раньше было раскидано
 * по отдельным кнопкам — выбор города, настройку пароля и выход. Открывается
 * поповером с именем и телефоном клиента сверху, а если пароль ещё не задан —
 * над самой кнопкой висит та же мигающая метка, что раньше была на иконке замка.
 */
const GarageProfileMenu = ({
  knownName,
  phone,
  openPhoneChange,
  city,
  setCity,
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
}: GarageProfileMenuProps) => {
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="relative h-10 w-10 shrink-0"
            title="Профиль"
          >
            <Icon name="User" size={16} />
            {!hasPassword && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-primary" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 flex flex-col gap-4">
          <div>
            <p className="font-head text-sm truncate">{knownName || "—"}</p>
            <button
              type="button"
              onClick={openPhoneChange}
              title="Сменить номер телефона"
              className="text-xs text-muted-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
            >
              {phone}
            </button>
          </div>

          <div>
            <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground block mb-1.5">
              Город
            </label>
            <CityInput
              value={city}
              onChange={(v) => {
                setCity(v);
                setStoredCity(v);
              }}
              className="h-9 text-sm bg-background"
            />
          </div>

          <button
            type="button"
            onClick={openPasswordSettings}
            className="flex items-center justify-between gap-2 h-10 px-3 rounded-sm border border-steel text-sm hover:border-primary/60 hover:text-foreground transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Icon name="Lock" size={15} />
              {hasPassword ? "Пароль для входа" : "Пароль не задан"}
            </span>
            {!hasPassword && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center gap-2 h-10 px-3 rounded-sm border border-steel text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors text-left"
          >
            <Icon name="LogOut" size={15} />
            Выйти
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={passwordSettingsOpen} onOpenChange={setPasswordSettingsOpen}>
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

export default GarageProfileMenu;