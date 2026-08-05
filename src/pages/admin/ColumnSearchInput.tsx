import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

type ColumnSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
};

const ColumnSearchInput = ({ value, onChange, suggestions }: ColumnSearchInputProps) => {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(query)).slice(0, 6);
  }, [value, suggestions]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Поиск…"
        autoComplete="off"
        className="h-8 text-xs font-normal normal-case tracking-normal bg-background"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-w-[220px] bg-popover border border-border rounded-sm shadow-md overflow-hidden">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-foreground hover:bg-accent transition-colors truncate"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnSearchInput;
