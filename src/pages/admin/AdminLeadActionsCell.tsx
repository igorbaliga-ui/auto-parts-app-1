import { Button } from '@/components/ui/button';
import { TableCell } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

type AdminLeadActionsCellProps = {
  leadId: number;
  savingId: number | null;
  saveLead: (id: number) => void;
  onSendPush: (id: number) => void;
  onShowHistory: (id: number) => void;
};

const AdminLeadActionsCell = ({
  leadId,
  savingId,
  saveLead,
  onSendPush,
  onShowHistory,
}: AdminLeadActionsCellProps) => {
  return (
    <TableCell>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          onClick={() => saveLead(leadId)}
          disabled={savingId === leadId}
          className="font-head uppercase tracking-wide text-xs h-9"
        >
          {savingId === leadId ? '…' : 'Сохранить'}
        </Button>
        <button
          onClick={() => onSendPush(leadId)}
          title="Отправить push-уведомление клиенту"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        >
          <Icon name="Send" size={15} />
        </button>
        <button
          onClick={() => onShowHistory(leadId)}
          title="История изменений"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        >
          <Icon name="History" size={15} />
        </button>
      </div>
    </TableCell>
  );
};

export default AdminLeadActionsCell;
