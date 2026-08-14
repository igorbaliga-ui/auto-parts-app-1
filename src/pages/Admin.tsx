import { useState } from 'react';
import PageBackground from '@/components/site/PageBackground';
import AdminLoginForm from './admin/AdminLoginForm';
import AdminLeadsTable from './admin/AdminLeadsTable';
import AdminContactsTab from './admin/AdminContactsTab';
import AdminReferralsTab from './admin/AdminReferralsTab';
import Icon from '@/components/ui/icon';
import { useAdminLeads } from './admin/useAdminLeads';

const Admin = () => {
  const a = useAdminLeads();
  const [page, setPage] = useState<'leads' | 'contacts' | 'referrals'>('leads');

  if (!a.authed) {
    return (
      <AdminLoginForm
        password={a.password}
        setPassword={a.setPassword}
        adminName={a.adminName}
        setAdminName={a.setAdminName}
        error={a.error}
        loading={a.loading}
        onSubmit={a.submit}
      />
    );
  }

  return (
    <PageBackground>
      <div className="px-5 sm:px-8 lg:px-12 pt-10 flex items-center gap-2">
        <button
          onClick={() => setPage('leads')}
          className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors flex items-center gap-2 ${
            page === 'leads'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          <Icon name="ClipboardList" size={15} />
          Заявки
        </button>
        <button
          onClick={() => setPage('contacts')}
          className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors flex items-center gap-2 ${
            page === 'contacts'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          <Icon name="Contact" size={15} />
          Контакты
        </button>
        <button
          onClick={() => setPage('referrals')}
          className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors flex items-center gap-2 ${
            page === 'referrals'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          <Icon name="Trophy" size={15} />
          Рефералы
        </button>
        <button
          onClick={a.logout}
          title="Выйти из админки"
          className="h-10 px-4 ml-auto rounded-sm border border-steel text-sm font-head uppercase tracking-wide text-muted-foreground hover:border-destructive/60 hover:text-destructive transition-colors flex items-center gap-2"
        >
          <Icon name="LogOut" size={15} />
          Выйти
        </button>
      </div>
      {page === 'contacts' ? (
        <div className="px-5 sm:px-8 lg:px-12 py-10">
          <AdminContactsTab adminPassword={a.password} />
        </div>
      ) : page === 'referrals' ? (
        <div className="px-5 sm:px-8 lg:px-12 py-10">
          <AdminReferralsTab adminPassword={a.password} />
        </div>
      ) : (
        <AdminLeadsTable
          leads={a.leads}
          filteredLeads={a.filteredLeads}
          drafts={a.drafts}
          savingId={a.savingId}
          adminPassword={a.password}
          adminName={a.adminName}
          hiddenColumns={a.hiddenColumns}
          columnFilters={a.columnFilters}
          suggestionsByColumn={a.suggestionsByColumn}
          hasActiveFilters={a.hasActiveFilters}
          loading={a.loading}
          isColumnVisible={a.isColumnVisible}
          toggleColumn={a.toggleColumn}
          setColumnFilter={a.setColumnFilter}
          clearFilters={a.clearFilters}
          setDraft={a.setDraft}
          setPrepaymentDraft={a.setPrepaymentDraft}
          setNoteDraft={a.setNoteDraft}
          pushPermission={a.pushPermission}
          pushSubscribing={a.pushSubscribing}
          subscribePush={a.subscribePush}
          saveLead={a.saveLead}
          saveLeadField={a.saveLeadField}
          toggleStatus={a.toggleStatus}
          toggleArrived={a.toggleArrived}
          toggleArchived={a.toggleArchived}
          resetGaragePassword={a.resetGaragePassword}
          toggleGarageBlock={a.toggleGarageBlock}
          saveClientNote={a.saveClientNote}
          onRefresh={a.onRefresh}
          statusTab={a.statusTab}
          setStatusTab={a.setStatusTab}
          newCount={a.newCount}
          inProgressCount={a.inProgressCount}
          doneCount={a.doneCount}
          archivedCount={a.archivedCount}
        />
      )}
    </PageBackground>
  );
};

export default Admin;