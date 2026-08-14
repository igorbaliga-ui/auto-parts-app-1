import { TableHeader, TableRow, TableHead } from '@/components/ui/table';
import ColumnSearchInput from './ColumnSearchInput';
import { ColumnKey, columns } from './adminTypes';

type AdminLeadsTableHeaderProps = {
  columnFilters: Partial<Record<ColumnKey, string>>;
  suggestionsByColumn: Record<ColumnKey, string[]>;
  isColumnVisible: (key: ColumnKey) => boolean;
  setColumnFilter: (key: ColumnKey, value: string) => void;
};

const AdminLeadsTableHeader = ({
  columnFilters,
  suggestionsByColumn,
  isColumnVisible,
  setColumnFilter,
}: AdminLeadsTableHeaderProps) => {
  return (
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
  );
};

export default AdminLeadsTableHeader;
