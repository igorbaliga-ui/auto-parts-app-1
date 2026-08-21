import { Input } from '@/components/ui/input';
import { TableCell } from '@/components/ui/table';
import ExpandableTextarea from '@/components/admin/ExpandableTextarea';
import Icon from '@/components/ui/icon';
import InlineEditableCell from './InlineEditableCell';
import ImageLightbox from '@/components/shared/ImageLightbox';
import { Lead, ColumnKey, messengerLabel, statusLabel, formatDate } from './adminTypes';

const MESSENGER_OPTIONS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

type AdminLeadOrderCellsProps = {
  lead: Lead;
  drafts: Record<number, { amount: string; prepayment: string; note: string }>;
  savingId: number | null;
  isColumnVisible: (key: ColumnKey) => boolean;
  setDraft: (id: number, value: string) => void;
  setPrepaymentDraft: (id: number, value: string) => void;
  setNoteDraft: (id: number, value: string) => void;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
  toggleStatus: (id: number) => void;
  toggleArrived: (id: number) => void;
  toggleArchived: (id: number) => void;
  saveClientNote: (id: number, note: string) => Promise<void>;
};

const AdminLeadOrderCells = ({
  lead: l,
  drafts,
  savingId,
  isColumnVisible,
  setDraft,
  setPrepaymentDraft,
  setNoteDraft,
  saveLeadField,
  toggleStatus,
  toggleArrived,
  toggleArchived,
  saveClientNote,
}: AdminLeadOrderCellsProps) => {
  return (
    <>
      {isColumnVisible('messenger') && (
        <TableCell>
          <InlineEditableCell
            value={l.messenger || ''}
            displayLabel="Мессенджер"
            options={MESSENGER_OPTIONS}
            onSave={(v) => saveLeadField(l.id, 'messenger', v)}
            inputClassName="w-28"
            renderValue={(v) => messengerLabel[v] ?? v}
          />
        </TableCell>
      )}
      {isColumnVisible('parts') && (
        <TableCell className="text-muted-foreground">
          <InlineEditableCell
            value={l.parts || ''}
            displayLabel="Запчасти"
            multiline
            expandable
            onSave={(v) => saveLeadField(l.id, 'parts', v)}
            inputClassName="w-48"
            textareaClassName="w-80"
            className="w-[220px] max-w-[220px] line-clamp-5 whitespace-pre-wrap break-words align-top"
          />
        </TableCell>
      )}
      {isColumnVisible('photo') && (
        <TableCell>
          {l.photo_urls && l.photo_urls.length > 0 ? (
            <ImageLightbox
              urls={l.photo_urls}
              className="flex items-center gap-1.5"
              imgClassName="h-12 w-12 object-cover rounded-sm border border-steel hover:border-primary transition-colors"
            />
          ) : (
            '—'
          )}
        </TableCell>
      )}
      {isColumnVisible('amount') && (
        <TableCell>
          <Input
            type="number"
            inputMode="decimal"
            value={drafts[l.id]?.amount ?? ''}
            onChange={(e) => setDraft(l.id, e.target.value)}
            placeholder="0"
            className="w-28 h-9"
          />
        </TableCell>
      )}
      {isColumnVisible('prepayment') && (
        <TableCell>
          <Input
            type="number"
            inputMode="decimal"
            value={drafts[l.id]?.prepayment ?? ''}
            onChange={(e) => setPrepaymentDraft(l.id, e.target.value)}
            placeholder="0"
            className="w-28 h-9"
          />
        </TableCell>
      )}
      {isColumnVisible('remaining') && (
        <TableCell className="whitespace-nowrap">
          {l.remaining != null ? `${l.remaining} ₽` : '—'}
        </TableCell>
      )}
      {isColumnVisible('cashback') && (
        <TableCell className="text-primary whitespace-nowrap">
          {l.cashback != null ? `${l.cashback} бонусов` : '—'}
        </TableCell>
      )}
      {isColumnVisible('status') && (
        <TableCell>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toggleStatus(l.id)}
              disabled={savingId === l.id}
              title={l.status === 'new' ? 'Новая заявка — нажмите, чтобы взять в работу' : undefined}
              className={`relative whitespace-nowrap text-[0.65rem] font-head uppercase tracking-wide px-2 py-1.5 rounded-sm transition-colors ${
                l.status === 'done'
                  ? 'bg-primary/15 text-primary hover:bg-primary/25'
                  : l.status === 'new'
                    ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {l.status === 'new' && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
              )}
              {statusLabel[l.status]}
            </button>
            {l.status === 'in_progress' && (
              <button
                onClick={() => toggleArrived(l.id)}
                disabled={savingId === l.id}
                title={l.arrived ? 'Убрать пометку «Поступило»' : 'Отметить «Поступило» и уведомить клиента'}
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
            <button
              onClick={() => toggleArchived(l.id)}
              disabled={savingId === l.id}
              title={l.archived ? 'Вернуть из архива' : 'Отправить в архив'}
              className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-sm transition-colors ${
                l.archived
                  ? 'bg-primary/15 text-primary hover:bg-primary/25'
                  : 'text-muted-foreground hover:text-primary hover:bg-muted'
              }`}
            >
              <Icon name={l.archived ? 'ArchiveRestore' : 'Archive'} size={13} />
            </button>
          </div>
        </TableCell>
      )}
      {isColumnVisible('completed_at') && (
        <TableCell className="whitespace-nowrap text-primary/80 text-sm">
          {l.completed_at ? formatDate(l.completed_at) : '—'}
        </TableCell>
      )}
      {isColumnVisible('handled_by') && (
        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
          {l.handled_by || '—'}
        </TableCell>
      )}
      {isColumnVisible('internal_note') && (
        <TableCell>
          <ExpandableTextarea
            value={drafts[l.id]?.note ?? ''}
            onChange={(v) => setNoteDraft(l.id, v)}
            title="Заметка (видна только менеджерам)"
            placeholder="Заметка для менеджеров"
            className="w-48 min-h-9 h-9 text-xs"
          />
        </TableCell>
      )}
      {isColumnVisible('phone_note') && (
        <TableCell>
          <InlineEditableCell
            value={l.phone_note || ''}
            displayLabel="Заметка по клиенту"
            multiline
            onSave={(v) => saveClientNote(l.id, v)}
            inputClassName="w-48"
            className="max-w-[220px] line-clamp-3 whitespace-pre-wrap align-top text-amber-500/90"
          />
        </TableCell>
      )}
    </>
  );
};

export default AdminLeadOrderCells;