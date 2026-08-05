import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cities } from '@/lib/garage-city';

type CityInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const CityInput = ({ value, onChange, placeholder = 'Введите город', className = '' }: CityInputProps) => {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return cities.slice(0, 6);
    return cities.filter((c) => c.toLowerCase().includes(query)).slice(0, 6);
  }, [value]);

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
        maxLength={20}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-w-[240px] bg-popover border border-border rounded-sm shadow-md overflow-hidden">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors truncate"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityInput;
