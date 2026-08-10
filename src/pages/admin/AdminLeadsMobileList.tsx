import { Lead } from './adminTypes';
import AdminLeadCard from './AdminLeadCard';

type AdminLeadsMobileListProps = {
  filteredLeads: Lead[];
  drafts: Record<number, { amount: string; prepayment: string; note: string }>;
  savingId: number | null;
  setDraft: (id: number, value: string) => void;
  setPrepaymentDraft: (id: number, value: string) => void;
  setNoteDraft: (id: number, value: string) => void;
  saveLead: (id: number) => void;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
  toggleStatus: (id: number) => void;
  toggleArrived: (id: number) => void;
  toggleArchived: (id: number) => void;
  resetGaragePassword: (id: number) => void;
  toggleGarageBlock: (id: number) => void;
  saveClientNote: (id: number, note: string) => Promise<void>;
  onShowHistory: (id: number) => void;
  onShowLoginHistory: (phone: string, name: string) => void;
  onSendPush: (id: number) => void;
};

const AdminLeadsMobileList = ({
  filteredLeads,
  drafts,
  savingId,
  setDraft,
  setPrepaymentDraft,
  setNoteDraft,
  saveLead,
  saveLeadField,
  toggleStatus,
  toggleArrived,
  toggleArchived,
  resetGaragePassword,
  toggleGarageBlock,
  saveClientNote,
  onShowHistory,
  onShowLoginHistory,
  onSendPush,
}: AdminLeadsMobileListProps) => {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {filteredLeads.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Ничего не найдено по заданным фильтрам.</p>
      ) : (
        filteredLeads.map((l) => (
          <AdminLeadCard
            key={l.id}
            lead={l}
            draft={drafts[l.id] ?? { amount: '', prepayment: '', note: '' }}
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
            onShowHistory={onShowHistory}
            onShowLoginHistory={onShowLoginHistory}
            onSendPush={onSendPush}
          />
        ))
      )}
    </div>
  );
};

export default AdminLeadsMobileList;