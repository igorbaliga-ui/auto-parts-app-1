import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PREVIEW_WIDTH_CH = 25;
const PREVIEW_MAX_LINES = 5;
const DIALOG_WIDTH_CH = 40;

type ExpandableTextProps = {
  text: string | null | undefined;
  label?: string;
  className?: string;
  emptyFallback?: string;
};

const ExpandableText = ({
  text,
  label = 'Текст',
  className = '',
  emptyFallback = '—',
}: ExpandableTextProps) => {
  const [open, setOpen] = useState(false);

  if (!text) {
    return <span className={className}>{emptyFallback}</span>;
  }

  // Прикидываем, влезет ли текст в превью шириной 25 символов и высотой 5 строк,
  // учитывая явные переносы строк в тексте
  const estimatedLines = text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / PREVIEW_WIDTH_CH)), 0);
  const isLong = estimatedLines > PREVIEW_MAX_LINES;

  return (
    <>
      <span className={className}>
        <span
          className="block whitespace-pre-wrap break-words align-top"
          style={{
            maxWidth: `${PREVIEW_WIDTH_CH}ch`,
            ...(isLong && {
              display: '-webkit-box',
              WebkitLineClamp: PREVIEW_MAX_LINES,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }),
          }}
        >
          {text}
        </span>
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-primary hover:underline whitespace-nowrap text-xs mt-0.5"
          >
            Показать полностью
          </button>
        )}
      </span>
      {isLong && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto w-fit max-w-[90vw]">
            <DialogHeader>
              <DialogTitle className="font-head uppercase tracking-wide text-xl">
                {label}
              </DialogTitle>
            </DialogHeader>
            <p
              className="text-sm whitespace-pre-wrap break-words"
              style={{ maxWidth: `${DIALOG_WIDTH_CH}ch` }}
            >
              {text}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ExpandableText;
