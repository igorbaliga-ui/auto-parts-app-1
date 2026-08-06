import { useState } from 'react';
import { Lead, ColumnKey } from './adminTypes';
import LeadHistoryDialog from './LeadHistoryDialog';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { useIsIosInstallable } from '@/hooks/use-ios-install-hint';
import AdminInstallBanners from './AdminInstallBanners';
import AdminToolbar from './AdminToolbar';
import AdminLeadsMobileList from './AdminLeadsMobileList';
import AdminLeadsDesktopTable from './AdminLeadsDesktopTable';
import ClientCashbackDialog from './ClientCashbackDialog';

type AdminLeadsTableProps = {
  leads: Lead[];
  filteredLeads: Lead[];
  drafts: Record<number, { amount: string; prepayment: string; note: string }>;
  savingId: number | null;
  adminPassword: string;
  adminName: string;
  hiddenColumns: Set<ColumnKey>;
  columnFilters: Partial<Record<ColumnKey, string>>;
  suggestionsByColumn: Record<ColumnKey, string[]>;
  hasActiveFilters: boolean;
  loading: boolean;
  isColumnVisible: (key: ColumnKey) => boolean;
  toggleColumn: (key: ColumnKey) => void;
  setColumnFilter: (key: ColumnKey, value: string) => void;
  clearFilters: () => void;
  setDraft: (id: number, value: string) => void;
  setPrepaymentDraft: (id: number, value: string) => void;
  setNoteDraft: (id: number, value: string) => void;
  pushPermission: NotificationPermission | 'unsupported';
  pushSubscribing: boolean;
  subscribePush: () => void;
  saveLead: (id: number) => void;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
  toggleStatus: (id: number) => void;
  toggleArrived: (id: number) => void;
  resetGaragePassword: (id: number) => void;
  onRefresh: () => void;
  statusTab: 'in_progress' | 'done' | 'all';
  setStatusTab: (tab: 'in_progress' | 'done' | 'all') => void;
  inProgressCount: number;
  doneCount: number;
};

const AdminLeadsTable = ({
  leads,
  filteredLeads,
  drafts,
  savingId,
  adminPassword,
  adminName,
  hiddenColumns,
  columnFilters,
  suggestionsByColumn,
  hasActiveFilters,
  loading,
  isColumnVisible,
  toggleColumn,
  setColumnFilter,
  clearFilters,
  setDraft,
  setPrepaymentDraft,
  setNoteDraft,
  pushPermission,
  pushSubscribing,
  subscribePush,
  saveLead,
  saveLeadField,
  toggleStatus,
  toggleArrived,
  resetGaragePassword,
  onRefresh,
  statusTab,
  setStatusTab,
  inProgressCount,
  doneCount,
}: AdminLeadsTableProps) => {
  const [historyLeadId, setHistoryLeadId] = useState<number | null>(null);
  const historyLead = leads.find((l) => l.id === historyLeadId) || null;
  const [cashbackDialogOpen, setCashbackDialogOpen] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();
  const isIosInstallable = useIsIosInstallable();

  return (
    <div className="min-h-screen text-foreground px-5 sm:px-8 lg:px-12 py-10">
      <div className="w-full">
        <AdminInstallBanners
          canInstall={canInstall}
          promptInstall={promptInstall}
          isIosInstallable={isIosInstallable}
          pushPermission={pushPermission}
          pushSubscribing={pushSubscribing}
          subscribePush={subscribePush}
        />

        <AdminToolbar
          leads={leads}
          filteredLeads={filteredLeads}
          hasActiveFilters={hasActiveFilters}
          loading={loading}
          isColumnVisible={isColumnVisible}
          toggleColumn={toggleColumn}
          clearFilters={clearFilters}
          onRefresh={onRefresh}
          statusTab={statusTab}
          setStatusTab={setStatusTab}
          inProgressCount={inProgressCount}
          doneCount={doneCount}
          onOpenCashback={() => setCashbackDialogOpen(true)}
        />

        {leads.length === 0 ? (
          <p className="text-muted-foreground">Пока нет заявок.</p>
        ) : (
          <>
            <AdminLeadsMobileList
              filteredLeads={filteredLeads}
              drafts={drafts}
              savingId={savingId}
              setDraft={setDraft}
              setPrepaymentDraft={setPrepaymentDraft}
              setNoteDraft={setNoteDraft}
              saveLead={saveLead}
              saveLeadField={saveLeadField}
              toggleStatus={toggleStatus}
              toggleArrived={toggleArrived}
              resetGaragePassword={resetGaragePassword}
              onShowHistory={setHistoryLeadId}
            />
            <AdminLeadsDesktopTable
              filteredLeads={filteredLeads}
              drafts={drafts}
              savingId={savingId}
              columnFilters={columnFilters}
              suggestionsByColumn={suggestionsByColumn}
              isColumnVisible={isColumnVisible}
              setColumnFilter={setColumnFilter}
              setDraft={setDraft}
              setPrepaymentDraft={setPrepaymentDraft}
              setNoteDraft={setNoteDraft}
              saveLead={saveLead}
              saveLeadField={saveLeadField}
              toggleStatus={toggleStatus}
              toggleArrived={toggleArrived}
              resetGaragePassword={resetGaragePassword}
              onShowHistory={setHistoryLeadId}
            />
          </>
        )}
      </div>
      {historyLead && (
        <LeadHistoryDialog
          leadId={historyLead.id}
          leadLabel={`${historyLead.name} — ${historyLead.vin || historyLead.car_name || historyLead.phone}`}
          adminPassword={adminPassword}
          open={historyLeadId !== null}
          onOpenChange={(open) => !open && setHistoryLeadId(null)}
        />
      )}
      <ClientCashbackDialog
        adminPassword={adminPassword}
        adminName={adminName}
        open={cashbackDialogOpen}
        onOpenChange={setCashbackDialogOpen}
      />
    </div>
  );
};

export default AdminLeadsTable;