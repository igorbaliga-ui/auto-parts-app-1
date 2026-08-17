import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import GarageProfileMenu from "./GarageProfileMenu";

type GarageHeaderProps = {
  knownName?: string;
  phone: string;
  openPhoneChange: () => void;
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
};

const GarageHeader = ({
  knownName,
  phone,
  openPhoneChange,
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
        <GarageProfileMenu
          knownName={knownName}
          phone={phone}
          openPhoneChange={openPhoneChange}
          city={city}
          setCity={setCity}
          openPasswordSettings={openPasswordSettings}
          setLogoutConfirmOpen={setLogoutConfirmOpen}
          passwordSettingsOpen={passwordSettingsOpen}
          setPasswordSettingsOpen={setPasswordSettingsOpen}
          hasPassword={hasPassword}
          savePasswordSettings={savePasswordSettings}
          oldPasswordInput={oldPasswordInput}
          setOldPasswordInput={setOldPasswordInput}
          newPasswordInput={newPasswordInput}
          setNewPasswordInput={setNewPasswordInput}
          newPasswordConfirmInput={newPasswordConfirmInput}
          setNewPasswordConfirmInput={setNewPasswordConfirmInput}
          passwordSettingsError={passwordSettingsError}
          passwordSettingsSuccess={passwordSettingsSuccess}
          passwordSettingsLoading={passwordSettingsLoading}
          removePasswordSettings={removePasswordSettings}
          logoutConfirmOpen={logoutConfirmOpen}
          logout={logout}
        />
      </div>
    </>
  );
};

export default GarageHeader;