import { useState } from 'react';
import { Lead, ColumnKey } from './adminTypes';
import LeadHistoryDialog from './LeadHistoryDialog';
import LoginHistoryDialog from './LoginHistoryDialog';
import SendPushDialog from './SendPushDialog';
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
  toggleArchived: (id: number) => void;
  resetGaragePassword: (id: number) => void;
  toggleGarageBlock: (id: number) => void;
  saveClientNote: (id: number, note: string) => Promise<void>;
  onRefresh: () => void;
  statusTab: 'new' | 'in_progress' | 'done' | 'all' | 'archived';
  setStatusTab: (tab: 'new' | 'in_progress' | 'done' | 'all' | 'archived') => void;
  newCount: number;
  inProgressCount: number;
  doneCount: number;
  archivedCount: number;
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
  toggleArchived,
  resetGaragePassword,
  toggleGarageBlock,
  saveClientNote,
  onRefresh,
  statusTab,
  setStatusTab,
  newCount,
  inProgressCount,
  doneCount,
  archivedCount,
}: AdminLeadsTableProps) => {
  const [historyLeadId, setHistoryLeadId] = useState<number | null>(null);
  const historyLead = leads.find((l) => l.id === historyLeadId) || null;
  const [loginHistoryClient, setLoginHistoryClient] = useState<{ phone: string; name: string } | null>(null);
  const [cashbackDialogOpen, setCashbackDialogOpen] = useState(false);
  const [sendPushLeadId, setSendPushLeadId] = useState<number | null>(null);
  const sendPushLead = leads.find((l) => l.id === sendPushLeadId) || null;
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
          newCount={newCount}
          inProgressCount={inProgressCount}
          doneCount={doneCount}
          archivedCount={archivedCount}
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
              toggleArchived={toggleArchived}
              resetGaragePassword={resetGaragePassword}
              toggleGarageBlock={toggleGarageBlock}
              saveClientNote={saveClientNote}
              onShowHistory={setHistoryLeadId}
              onShowLoginHistory={(phone, name) => setLoginHistoryClient({ phone, name })}
              onSendPush={setSendPushLeadId}
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
              toggleArchived={toggleArchived}
              resetGaragePassword={resetGaragePassword}
              toggleGarageBlock={toggleGarageBlock}
              saveClientNote={saveClientNote}
              onShowHistory={setHistoryLeadId}
              onShowLoginHistory={(phone, name) => setLoginHistoryClient({ phone, name })}
              onSendPush={setSendPushLeadId}
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
      {loginHistoryClient && (
        <LoginHistoryDialog
          phone={loginHistoryClient.phone}
          clientLabel={`${loginHistoryClient.name} — ${loginHistoryClient.phone}`}
          adminPassword={adminPassword}
          open={loginHistoryClient !== null}
          onOpenChange={(open) => !open && setLoginHistoryClient(null)}
        />
      )}
      {sendPushLead && (
        <SendPushDialog
          leadId={sendPushLead.id}
          clientLabel={`${sendPushLead.name} — ${sendPushLead.phone}`}
          adminPassword={adminPassword}
          open={sendPushLeadId !== null}
          onOpenChange={(open) => !open && setSendPushLeadId(null)}
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