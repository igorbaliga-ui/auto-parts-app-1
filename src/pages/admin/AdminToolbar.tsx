import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { Lead, ColumnKey, columns } from './adminTypes';
import { exportLeadsToExcel } from './exportLeads';

type AdminToolbarProps = {
  leads: Lead[];
  filteredLeads: Lead[];
  hasActiveFilters: boolean;
  loading: boolean;
  isColumnVisible: (key: ColumnKey) => boolean;
  toggleColumn: (key: ColumnKey) => void;
  clearFilters: () => void;
  onRefresh: () => void;
  statusTab: 'new' | 'in_progress' | 'done' | 'all' | 'archived';
  setStatusTab: (tab: 'new' | 'in_progress' | 'done' | 'all' | 'archived') => void;
  newCount: number;
  inProgressCount: number;
  doneCount: number;
  archivedCount: number;
  onOpenCashback: () => void;
};

const AdminToolbar = ({
  leads,
  filteredLeads,
  hasActiveFilters,
  loading,
  isColumnVisible,
  toggleColumn,
  clearFilters,
  onRefresh,
  statusTab,
  setStatusTab,
  newCount,
  inProgressCount,
  doneCount,
  archivedCount,
  onOpenCashback,
}: AdminToolbarProps) => {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-head uppercase tracking-wide text-2xl">
          Заявки ({filteredLeads.length}{filteredLeads.length !== leads.length ? ` из ${leads.length}` : ''})
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="font-head uppercase tracking-wide text-muted-foreground"
            >
              <Icon name="X" size={16} className="mr-2" />
              <span className="hidden sm:inline">Сбросить фильтры</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="hidden md:flex font-head uppercase tracking-wide">
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
            onClick={onOpenCashback}
            className="font-head uppercase tracking-wide"
          >
            <Icon name="Wallet" size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Кэшбэк клиентов</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportLeadsToExcel(filteredLeads, isColumnVisible)}
            disabled={filteredLeads.length === 0}
            className="font-head uppercase tracking-wide"
          >
            <Icon name="FileSpreadsheet" size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Выгрузить в Excel</span>
          </Button>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={loading}
            className="font-head uppercase tracking-wide"
          >
            <Icon name="RefreshCw" size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
        <button
          onClick={() => setStatusTab('new')}
          className={`shrink-0 h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            statusTab === 'new'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          {newCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
          Новые ({newCount})
        </button>
        <button
          onClick={() => setStatusTab('in_progress')}
          className={`shrink-0 h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors whitespace-nowrap ${
            statusTab === 'in_progress'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          В работе ({inProgressCount})
        </button>
        <button
          onClick={() => setStatusTab('done')}
          className={`shrink-0 h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors whitespace-nowrap ${
            statusTab === 'done'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          Выполненные ({doneCount})
        </button>
        <button
          onClick={() => setStatusTab('all')}
          className={`shrink-0 h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors whitespace-nowrap ${
            statusTab === 'all'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          Все ({newCount + inProgressCount + doneCount})
        </button>
        <button
          onClick={() => setStatusTab('archived')}
          className={`shrink-0 h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            statusTab === 'archived'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-steel text-muted-foreground hover:border-primary/60'
          }`}
        >
          <Icon name="Archive" size={14} />
          Архив ({archivedCount})
        </button>
      </div>
    </>
  );
};

export default AdminToolbar;