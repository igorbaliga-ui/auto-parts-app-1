import { RequestProvider } from '@/components/site/RequestDialog';
import PageBackground from '@/components/site/PageBackground';
import { useGarageState } from './garage/useGarageState';
import {
  CheckingSavedView,
  ResetPasswordView,
  PasswordRequiredView,
  PhoneEntryView,
} from './garage/GarageAuthForms';
import GarageHeader from './garage/GarageHeader';
import GarageOrdersList from './garage/GarageOrdersList';
import CashbackHistoryDialog from './garage/CashbackHistoryDialog';
import GarageArchiveDialog from './garage/GarageArchiveDialog';

const GarageContent = () => {
  const g = useGarageState();

  if (g.checkingSaved) {
    return <CheckingSavedView />;
  }

  if (!g.authed && g.passwordRequired && g.resetPasswordMode) {
    return (
      <ResetPasswordView
        phone={g.phone}
        resetNameInput={g.resetNameInput}
        setResetNameInput={g.setResetNameInput}
        resetPasswordInput={g.resetPasswordInput}
        setResetPasswordInput={g.setResetPasswordInput}
        resetError={g.resetError}
        resetLoading={g.resetLoading}
        submitResetPassword={g.submitResetPassword}
        setResetPasswordMode={g.setResetPasswordMode}
        setResetError={g.setResetError}
      />
    );
  }

  if (!g.authed && g.passwordRequired) {
    return (
      <PasswordRequiredView
        phone={g.phone}
        submitPassword={g.submitPassword}
        passwordInput={g.passwordInput}
        setPasswordInput={g.setPasswordInput}
        error={g.error}
        loading={g.loading}
        setResetPasswordMode={g.setResetPasswordMode}
        setResetError={g.setResetError}
        setPasswordRequired={g.setPasswordRequired}
        setError={g.setError}
      />
    );
  }

  if (!g.authed) {
    return (
      <PhoneEntryView
        submit={g.submit}
        phone={g.phone}
        setPhone={g.setPhone}
        error={g.error}
        loading={g.loading}
        checkingPassword={g.checkingPassword}
      />
    );
  }

  return (
    <PageBackground>
    <div className="min-h-screen text-foreground px-5 sm:px-8 lg:px-12 py-10 relative">
      <div className="max-w-[1000px] mx-auto">
        <GarageHeader
          city={g.city}
          setCity={g.setCity}
          onNewRequest={g.onNewRequest}
          openPasswordSettings={g.openPasswordSettings}
          setLogoutConfirmOpen={g.setLogoutConfirmOpen}
          passwordSettingsOpen={g.passwordSettingsOpen}
          setPasswordSettingsOpen={g.setPasswordSettingsOpen}
          hasPassword={g.hasPassword}
          savePasswordSettings={g.savePasswordSettings}
          oldPasswordInput={g.oldPasswordInput}
          setOldPasswordInput={g.setOldPasswordInput}
          newPasswordInput={g.newPasswordInput}
          setNewPasswordInput={g.setNewPasswordInput}
          newPasswordConfirmInput={g.newPasswordConfirmInput}
          setNewPasswordConfirmInput={g.setNewPasswordConfirmInput}
          passwordSettingsError={g.passwordSettingsError}
          passwordSettingsSuccess={g.passwordSettingsSuccess}
          passwordSettingsLoading={g.passwordSettingsLoading}
          removePasswordSettings={g.removePasswordSettings}
          logoutConfirmOpen={g.logoutConfirmOpen}
          logout={g.logout}
        />

        <GarageOrdersList
          orders={g.orders}
          totalCashback={g.totalCashback}
          onShowCashbackHistory={() => g.setCashbackHistoryOpen(true)}
          pushPermission={g.pushPermission}
          pushSubscribing={g.pushSubscribing}
          pushSubscribed={g.pushSubscribed}
          subscribePush={g.subscribePush}
          onNewRequest={g.onNewRequest}
          onOpenArchive={() => g.setArchiveDialogOpen(true)}
          statusTab={g.statusTab}
          setStatusTab={g.setStatusTab}
          newOrders={g.newOrders}
          inProgressOrders={g.inProgressOrders}
          doneOrders={g.doneOrders}
          visibleOrders={g.visibleOrders}
          carNameDrafts={g.carNameDrafts}
          setCarNameDrafts={g.setCarNameDrafts}
          savedCarNames={g.savedCarNames}
          savingCarId={g.savingCarId}
          saveCarName={g.saveCarName}
        />
      </div>
      <CashbackHistoryDialog
        history={g.cashbackHistory}
        open={g.cashbackHistoryOpen}
        onOpenChange={g.setCashbackHistoryOpen}
      />
      <GarageArchiveDialog
        orders={g.archivedOrders}
        open={g.archiveDialogOpen}
        onOpenChange={g.setArchiveDialogOpen}
      />
    </div>
    </PageBackground>
  );
};

const Garage = () => (
  <RequestProvider>
    <GarageContent />
  </RequestProvider>
);

export default Garage;