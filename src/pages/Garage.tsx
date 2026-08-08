import { RequestProvider } from '@/components/site/RequestDialog';
import PageBackground from '@/components/site/PageBackground';
import Icon from '@/components/ui/icon';
import { useGarageState } from './garage/useGarageState';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
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
  const { pullDistance, refreshing, threshold } = usePullToRefresh(
    g.refresh,
    !g.authed,
  );

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
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed left-0 right-0 top-0 z-30 flex items-start justify-center pointer-events-none"
          style={{ height: Math.max(pullDistance, refreshing ? threshold : 0) }}
        >
          <Icon
            name="Loader2"
            size={22}
            className={`text-primary mt-4 ${refreshing ? "animate-spin" : ""}`}
            style={{
              transform: refreshing
                ? undefined
                : `rotate(${Math.min((pullDistance / threshold) * 360, 360)}deg)`,
              opacity: Math.min(pullDistance / threshold, 1),
            }}
          />
        </div>
      )}
      <div
        className="max-w-[1000px] mx-auto transition-transform animate-fade-in"
        style={{
          transform: `translateY(${refreshing ? threshold : pullDistance}px)`,
        }}
      >
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
          searchQuery={g.searchQuery}
          setSearchQuery={g.setSearchQuery}
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