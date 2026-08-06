import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import ColumnSearchInput from './ColumnSearchInput';
import { Lead, ColumnKey, columns, messengerLabel, statusLabel, formatDate } from './adminTypes';

type AdminLeadsTableProps = {
  leads: Lead[];
  filteredLeads: Lead[];
  drafts: Record<number, { amount: string }>;
  savingId: number | null;
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
  saveLead: (id: number) => void;
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
  saveLead,
  toggleStatus,
  toggleArrived,
  resetGaragePassword,
  onRefresh,
  statusTab,
  setStatusTab,
  inProgressCount,
  doneCount,
}: AdminLeadsTableProps) => {
  return (
    <div className="min-h-screen text-foreground px-5 sm:px-8 lg:px-12 py-10">
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-head uppercase tracking-wide text-2xl">
            Заявки ({filteredLeads.length}{filteredLeads.length !== leads.length ? ` из ${leads.length}` : ''})
          </h1>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="font-head uppercase tracking-wide text-muted-foreground"
              >
                <Icon name="X" size={16} className="mr-2" />
                Сбросить фильтры
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="font-head uppercase tracking-wide">
                  <Icon name="Columns3" size={16} className="mr-2" />
                  Столбцы
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Показывать столбцы</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={isColumnVisible(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={loading}
              className="font-head uppercase tracking-wide"
            >
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Обновить
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setStatusTab('in_progress')}
            className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
              statusTab === 'in_progress'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-steel text-muted-foreground hover:border-primary/60'
            }`}
          >
            В работе ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusTab('done')}
            className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
              statusTab === 'done'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-steel text-muted-foreground hover:border-primary/60'
            }`}
          >
            Выполненные ({doneCount})
          </button>
          <button
            onClick={() => setStatusTab('all')}
            className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
              statusTab === 'all'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-steel text-muted-foreground hover:border-primary/60'
            }`}
          >
            Все ({inProgressCount + doneCount})
          </button>
        </div>

        {leads.length === 0 ? (
          <p className="text-muted-foreground">Пока нет заявок.</p>
        ) : (
          <div className="bg-card border border-steel rounded-sm overflow-x-auto">
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
                    {isColumnVisible('date') && (
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {formatDate(l.created_at)}
                      </TableCell>
                    )}
                    {isColumnVisible('vin') && (
                      <TableCell className="font-head tracking-[0.1em]">{l.vin || '—'}</TableCell>
                    )}
                    {isColumnVisible('car') && (
                      <TableCell className="text-muted-foreground">{l.car_name || '—'}</TableCell>
                    )}
                    {isColumnVisible('name') && <TableCell>{l.name}</TableCell>}
                    {isColumnVisible('phone') && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <a href={`tel:${l.phone}`} className="hover:text-primary whitespace-nowrap">
                            {l.phone}
                          </a>
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
                      <TableCell className="text-muted-foreground">{l.city || '—'}</TableCell>
                    )}
                    {isColumnVisible('messenger') && (
                      <TableCell>
                        {l.messenger ? messengerLabel[l.messenger] ?? l.messenger : '—'}
                      </TableCell>
                    )}
                    {isColumnVisible('parts') && (
                      <TableCell className="text-muted-foreground">
                        <ExpandableText text={l.parts} label="Интересующие запчасти" />
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
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('completed_at') && (
                      <TableCell className="whitespace-nowrap text-primary/80 text-sm">
                        {l.completed_at ? formatDate(l.completed_at) : '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveLead(l.id)}
                        disabled={savingId === l.id}
                        className="font-head uppercase tracking-wide text-xs h-9"
                      >
                        {savingId === l.id ? '…' : 'Сохранить'}
                      </Button>
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
        )}
      </div>
    </div>
  );
};

export default AdminLeadsTable;