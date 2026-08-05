import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ExpandableTextProps = {
  text: string | null | undefined;
  label?: string;
  maxChars?: number;
  className?: string;
  emptyFallback?: string;
};

const ExpandableText = ({
  text,
  label = 'Текст',
  maxChars = 60,
  className = '',
  emptyFallback = '—',
}: ExpandableTextProps) => {
  const [open, setOpen] = useState(false);

  if (!text) {
    return <span className={className}>{emptyFallback}</span>;
  }

  const isLong = text.length > maxChars;
  const preview = isLong ? `${text.slice(0, maxChars).trimEnd()}…` : text;

  return (
    <>
      <span className={className}>
        {preview}
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-1.5 text-primary hover:underline whitespace-nowrap"
          >
            Показать полностью
          </button>
        )}
      </span>
      {isLong && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-head uppercase tracking-wide text-xl">
                {label}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ExpandableText;
