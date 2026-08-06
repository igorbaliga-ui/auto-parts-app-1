import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { formatDate } from './adminTypes';

const LEAD_CHANGES_URL = 'https://functions.poehali.dev/3ae55815-e7e6-45e9-9ca9-4e1a4f7202f2';

type Change = {
  id: number;
  admin_name: string;
  field: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
};

type LeadHistoryDialogProps = {
  leadId: number;
  leadLabel: string;
  adminPassword: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LeadHistoryDialog = ({ leadId, leadLabel, adminPassword, open, onOpenChange }: LeadHistoryDialogProps) => {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    fetch(`${LEAD_CHANGES_URL}?lead_id=${leadId}`, {
      headers: { 'X-Admin-Password': adminPassword },
    })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => setChanges(data.changes || []))
      .catch(() => setError('Не удалось загрузить историю изменений'))
      .finally(() => setLoading(false));
  }, [open, leadId, adminPassword]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История изменений</DialogTitle>
          <DialogDescription>{leadLabel}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
        ) : error ? (
          <p className="text-primary text-sm py-4">{error}</p>
        ) : changes.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Изменений пока не было.</p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {changes.map((c) => (
              <div key={c.id} className="border-l-2 border-primary/40 pl-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1.5 font-head uppercase tracking-wide">
                    <Icon name="User" size={12} />
                    {c.admin_name}
                  </span>
                  <span className="whitespace-nowrap">{formatDate(c.changed_at)}</span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{c.field_label}: </span>
                  <span className="line-through text-muted-foreground/70">{c.old_value ?? '—'}</span>
                  {' → '}
                  <span className="text-primary">{c.new_value ?? '—'}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadHistoryDialog;
