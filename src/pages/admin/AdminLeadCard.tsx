import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import ExpandableText from '@/components/shared/ExpandableText';
import { Lead, messengerLabel, statusLabel, formatDate } from './adminTypes';

type AdminLeadCardProps = {
  lead: Lead;
  draft: { amount: string; prepayment: string; note: string };
  savingId: number | null;
  setDraft: (id: number, value: string) => void;
  setPrepaymentDraft: (id: number, value: string) => void;
  setNoteDraft: (id: number, value: string) => void;
  saveLead: (id: number) => void;
  toggleStatus: (id: number) => void;
  toggleArrived: (id: number) => void;
  resetGaragePassword: (id: number) => void;
  onShowHistory: (id: number) => void;
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0 pt-1.5">{label}</span>
    <div className="text-right min-w-0">{children}</div>
  </div>
);

const AdminLeadCard = ({
  lead: l,
  draft,
  savingId,
  setDraft,
  setPrepaymentDraft,
  setNoteDraft,
  saveLead,
  toggleStatus,
  toggleArrived,
  resetGaragePassword,
  onShowHistory,
}: AdminLeadCardProps) => {
  return (
    <div className="bg-card border border-steel rounded-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-head tracking-[0.08em] text-base truncate">{l.name}</span>
        <span className="text-muted-foreground text-xs shrink-0">{formatDate(l.created_at)}</span>
      </div>

      <Row label="VIN">
        <span className="font-head tracking-[0.08em]">{l.vin || '—'}</span>
      </Row>
      {l.car_name && <Row label="Авто">{l.car_name}</Row>}
      <Row label="Телефон">
        <div className="flex items-center gap-1.5 justify-end">
          <a href={`tel:${l.phone}`} className="hover:text-primary whitespace-nowrap">
            {l.phone}
          </a>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                title="Сбросить пароль от «Гаража»"
                disabled={savingId === l.id}
                className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <Icon name="KeyRound" size={13} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить пароль клиента?</AlertDialogTitle>
                <AlertDialogDescription>
                  Клиент {l.name} ({l.phone}) сможет войти в «Гараж» по одному телефону,
                  без пароля, и при желании задать новый.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetGaragePassword(l.id)}>
                  Сбросить пароль
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Row>
      {l.city && <Row label="Город">{l.city}</Row>}
      {l.messenger && (
        <Row label="Мессенджер">{messengerLabel[l.messenger] ?? l.messenger}</Row>
      )}
      {l.parts && (
        <Row label="Запчасти">
          <ExpandableText text={l.parts} label="Интересующие запчасти" className="text-left" />
        </Row>
      )}
      {l.photo_url && (
        <Row label="Фото СТС">
          <a href={l.photo_url} target="_blank" rel="noreferrer">
            <img
              src={l.photo_url}
              alt="Фото СТС"
              className="h-12 w-12 object-cover rounded-sm border border-steel ml-auto"
            />
          </a>
        </Row>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Сумма заказа
          </label>
          <Input
            type="number"
            value={draft.amount}
            onChange={(e) => setDraft(l.id, e.target.value)}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Предоплата
          </label>
          <Input
            type="number"
            value={draft.prepayment}
            onChange={(e) => setPrepaymentDraft(l.id, e.target.value)}
            placeholder="0"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-2 text-sm">
        <span className="text-muted-foreground">
          Остаток: <span className="text-foreground">{l.remaining != null ? `${l.remaining} ₽` : '—'}</span>
        </span>
        <span className="text-muted-foreground">
          Кэшбэк: <span className="text-primary">{l.cashback != null ? `${l.cashback} ₽` : '—'}</span>
        </span>
      </div>

      <div>
        <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1 mt-2">
          Заметка (видна только менеджерам)
        </label>
        <Textarea
          value={draft.note}
          onChange={(e) => setNoteDraft(l.id, e.target.value)}
          placeholder="Заметка для менеджеров"
          className="min-h-16 text-sm"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <button
          onClick={() => toggleStatus(l.id)}
          disabled={savingId === l.id}
          className={`whitespace-nowrap text-[0.65rem] font-head uppercase tracking-wide px-2 py-1.5 rounded-sm transition-colors ${
            l.status === 'done'
              ? 'bg-primary/15 text-primary hover:bg-primary/25'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          {statusLabel[l.status]}
        </button>
        {l.status === 'in_progress' && (
          <button
            onClick={() => toggleArrived(l.id)}
            disabled={savingId === l.id}
            className={`shrink-0 flex items-center gap-1 whitespace-nowrap text-[0.65rem] font-head uppercase tracking-wide px-2 py-1.5 rounded-sm transition-colors ${
              l.arrived
                ? 'bg-green-600/15 text-green-500 hover:bg-green-600/25'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon name="Check" size={11} />
            Поступило
          </button>
        )}
        {l.completed_at && (
          <span className="text-primary/80 text-xs ml-auto">Выполнен {formatDate(l.completed_at)}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <Button
          size="sm"
          onClick={() => saveLead(l.id)}
          disabled={savingId === l.id}
          className="font-head uppercase tracking-wide text-xs h-9 flex-1"
        >
          {savingId === l.id ? '…' : 'Сохранить'}
        </Button>
        <button
          onClick={() => onShowHistory(l.id)}
          title="История изменений"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors border border-steel"
        >
          <Icon name="History" size={15} />
        </button>
      </div>
    </div>
  );
};

export default AdminLeadCard;
