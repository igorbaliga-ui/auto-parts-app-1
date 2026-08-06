import PageBackground from '@/components/site/PageBackground';
import AdminLoginForm from './admin/AdminLoginForm';
import AdminLeadsTable from './admin/AdminLeadsTable';
import { useAdminLeads } from './admin/useAdminLeads';

const Admin = () => {
  const a = useAdminLeads();

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
        toggleStatus={a.toggleStatus}
        toggleArrived={a.toggleArrived}
        resetGaragePassword={a.resetGaragePassword}
        onRefresh={a.onRefresh}
        statusTab={a.statusTab}
        setStatusTab={a.setStatusTab}
        inProgressCount={a.inProgressCount}
        doneCount={a.doneCount}
      />
    </PageBackground>
  );
};

export default Admin;