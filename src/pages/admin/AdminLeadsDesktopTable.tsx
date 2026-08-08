import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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
import ColumnSearchInput from './ColumnSearchInput';
import InlineEditableCell from './InlineEditableCell';
import { Lead, ColumnKey, columns, messengerLabel, statusLabel, formatDate } from './adminTypes';

const MESSENGER_OPTIONS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

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
  onShowHistory: (id: number) => void;
  onShowLoginHistory: (phone: string, name: string) => void;
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
  onShowHistory,
  onShowLoginHistory,
}: AdminLeadsDesktopTableProps) => {
  return (
    <div className="hidden md:block bg-card border border-steel rounded-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(
              (col) =>
                isColumnVisible(col.key) && <TableHead key={col.key}>{col.label}</TableHead>,
            )}
            <TableHead />
          </TableRow>
          <TableRow>
            {columns.map((col) => {
              if (!isColumnVisible(col.key)) return null;
              if (!col.searchable) return <TableHead key={col.key} />;
              return (
                <TableHead key={col.key} className="py-2">
                  <ColumnSearchInput
                    value={columnFilters[col.key] ?? ''}
                    onChange={(v) => setColumnFilter(col.key, v)}
                    suggestions={suggestionsByColumn[col.key] || []}
                  />
                </TableHead>
              );
            })}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLeads.map((l) => (
            <TableRow key={l.id}>
              {isColumnVisible('number') && (
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                  {l.id}
                </TableCell>
              )}
              {isColumnVisible('date') && (
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                  {formatDate(l.created_at)}
                </TableCell>
              )}
              {isColumnVisible('vin') && (
                <TableCell className="font-head tracking-[0.1em]">
                  <InlineEditableCell
                    value={l.vin || ''}
                    displayLabel="VIN"
                    onSave={(v) => saveLeadField(l.id, 'vin', v)}
                    inputClassName="w-40"
                  />
                </TableCell>
              )}
              {isColumnVisible('car') && (
                <TableCell className="text-muted-foreground">
                  <InlineEditableCell
                    value={l.car_name || ''}
                    displayLabel="Авто"
                    onSave={(v) => saveLeadField(l.id, 'car_name', v)}
                    inputClassName="w-32"
                  />
                </TableCell>
              )}
              {isColumnVisible('name') && (
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <InlineEditableCell
                      value={l.name}
                      displayLabel="Имя"
                      required
                      onSave={(v) => saveLeadField(l.id, 'name', v)}
                      inputClassName="w-32"
                    />
                    <button
                      title="История входов в «Гараж»"
                      onClick={() => onShowLoginHistory(l.phone, l.name)}
                      className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                    >
                      <Icon name="History" size={13} />
                    </button>
                  </div>
                </TableCell>
              )}
              {isColumnVisible('phone') && (
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <InlineEditableCell
                      value={l.phone}
                      displayLabel="Телефон"
                      required
                      onSave={(v) => saveLeadField(l.id, 'phone', v)}
                      inputClassName="w-32"
                      renderValue={(v) => (
                        <a
                          href={`tel:${v}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary whitespace-nowrap"
                        >
                          {v}
                        </a>
                      )}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          title="Сбросить пароль от «Гаража» для этого клиента"
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
                </TableCell>
              )}
              {isColumnVisible('city') && (
                <TableCell className="text-muted-foreground">
                  <InlineEditableCell
                    value={l.city || ''}
                    displayLabel="Город"
                    onSave={(v) => saveLeadField(l.id, 'city', v)}
                    inputClassName="w-28"
                  />
                </TableCell>
              )}
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
                    onSave={(v) => saveLeadField(l.id, 'parts', v)}
                    inputClassName="w-48"
                    className="max-w-[220px] line-clamp-3 whitespace-pre-wrap align-top"
                  />
                </TableCell>
              )}
              {isColumnVisible('photo') && (
                <TableCell>
                  {l.photo_url ? (
                    <a href={l.photo_url} target="_blank" rel="noreferrer">
                      <img
                        src={l.photo_url}
                        alt="Фото СТС"
                        className="h-12 w-12 object-cover rounded-sm border border-steel hover:border-primary transition-colors"
                      />
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
              )}
              {isColumnVisible('amount') && (
                <TableCell>
                  <Input
                    type="number"
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
                  {l.cashback != null ? `${l.cashback} ₽` : '—'}
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
              {isColumnVisible('internal_note') && (
                <TableCell>
                  <Textarea
                    value={drafts[l.id]?.note ?? ''}
                    onChange={(e) => setNoteDraft(l.id, e.target.value)}
                    placeholder="Заметка для менеджеров"
                    title="Видна только менеджерам, клиент её не видит"
                    className="w-48 min-h-9 h-9 text-xs resize-y"
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => saveLead(l.id)}
                    disabled={savingId === l.id}
                    className="font-head uppercase tracking-wide text-xs h-9"
                  >
                    {savingId === l.id ? '…' : 'Сохранить'}
                  </Button>
                  <button
                    onClick={() => onShowHistory(l.id)}
                    title="История изменений"
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  >
                    <Icon name="History" size={15} />
                  </button>
                </div>
              </TableCell>
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