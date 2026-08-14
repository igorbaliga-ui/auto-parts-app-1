import {
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import AdminLeadsTableHeader from './AdminLeadsTableHeader';
import AdminLeadIdentityCells from './AdminLeadIdentityCells';
import AdminLeadOrderCells from './AdminLeadOrderCells';
import AdminLeadActionsCell from './AdminLeadActionsCell';
import { Lead, ColumnKey, columns } from './adminTypes';

type AdminLeadsDesktopTableProps = {
  filteredLeads: Lead[];
  drafts: Record<number, { amount: string; prepayment: string; note: string }>;
  savingId: number | null;
  columnFilters: Partial<Record<ColumnKey, string>>;
  suggestionsByColumn: Record<ColumnKey, string[]>;
  isColumnVisible: (key: ColumnKey) => boolean;
  setColumnFilter: (key: ColumnKey, value: string) => void;
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

const AdminLeadsDesktopTable = ({
  filteredLeads,
  drafts,
  savingId,
  columnFilters,
  suggestionsByColumn,
  isColumnVisible,
  setColumnFilter,
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
}: AdminLeadsDesktopTableProps) => {
  return (
    <div className="hidden md:block bg-card border border-steel rounded-sm overflow-x-auto">
      <Table>
        <AdminLeadsTableHeader
          columnFilters={columnFilters}
          suggestionsByColumn={suggestionsByColumn}
          isColumnVisible={isColumnVisible}
          setColumnFilter={setColumnFilter}
        />
        <TableBody>
          {filteredLeads.map((l) => (
            <TableRow key={l.id}>
              <AdminLeadIdentityCells
                lead={l}
                savingId={savingId}
                isColumnVisible={isColumnVisible}
                saveLeadField={saveLeadField}
                resetGaragePassword={resetGaragePassword}
                toggleGarageBlock={toggleGarageBlock}
                onShowLoginHistory={onShowLoginHistory}
              />
              <AdminLeadOrderCells
                lead={l}
                drafts={drafts}
                savingId={savingId}
                isColumnVisible={isColumnVisible}
                setDraft={setDraft}
                setPrepaymentDraft={setPrepaymentDraft}
                setNoteDraft={setNoteDraft}
                saveLeadField={saveLeadField}
                toggleStatus={toggleStatus}
                toggleArrived={toggleArrived}
                toggleArchived={toggleArchived}
                saveClientNote={saveClientNote}
              />
              <AdminLeadActionsCell
                leadId={l.id}
                savingId={savingId}
                saveLead={saveLead}
                onSendPush={onSendPush}
                onShowHistory={onShowHistory}
              />
            </TableRow>
          ))}
          {filteredLeads.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                Ничего не найдено по заданным фильтрам.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminLeadsDesktopTable;
