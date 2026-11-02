import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { money } from './api';

type Props = {
  amount: number | null;
  prepayment: number | null;
  onSave: (patch: { order_amount?: number | null; prepayment?: number | null }) => Promise<boolean>;
};

const parse = (v: string): number | null | undefined => {
  const s = v.replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const toText = (n: number | null) => (n == null ? '' : String(n));

const LeadAmounts = ({ amount, prepayment, onSave }: Props) => {
  const [a, setA] = useState(toText(amount));
  const [p, setP] = useState(toText(prepayment));

  useEffect(() => {
    setA(toText(amount));
    setP(toText(prepayment));
  }, [amount, prepayment]);

  const pa = parse(a);
  const pp = parse(p);
  const remaining = pa != null && pa !== undefined ? pa - (pp ?? 0) : null;

  const commit = async (field: 'order_amount' | 'prepayment') => {
    const val = field === 'order_amount' ? pa : pp;
    const prev = field === 'order_amount' ? amount : prepayment;
    if (val === undefined) {
      setA(toText(amount));
      setP(toText(prepayment));
      return;
    }
    if (val === prev) return;
    const ok = await onSave({ [field]: val });
    if (!ok) {
      setA(toText(amount));
      setP(toText(prepayment));
    }
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="flex flex-col gap-1 min-w-[150px]" onClick={stop}>
      <Input
        inputMode="decimal"
        value={a}
        onChange={(e) => setA(e.target.value)}
        onBlur={() => commit('order_amount')}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="Сумма заказа"
        className="h-8 text-right text-xs"
      />
      <Input
        inputMode="decimal"
        value={p}
        onChange={(e) => setP(e.target.value)}
        onBlur={() => commit('prepayment')}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="Предоплата"
        className="h-8 text-right text-xs"
      />
      <div className="text-xs text-right text-muted-foreground">Остаток: {remaining != null ? money(remaining) : '—'}</div>
    </div>
  );
};

export default LeadAmounts;
