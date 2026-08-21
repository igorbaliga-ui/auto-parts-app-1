import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SelectOption = { value: string; label: string };

type InlineEditableCellProps = {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  displayLabel?: string;
  emptyFallback?: string;
  multiline?: boolean;
  /** Многострочные поля открывать большим окном вместо тесной строчной textarea. */
  expandable?: boolean;
  options?: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  textareaClassName?: string;
  renderValue?: (value: string) => React.ReactNode;
};

/**
 * Текст/значение, которое по клику превращается в поле ввода (или выпадающий список,
 * если заданы options) и сохраняется по Enter/потере фокуса. Пока не нажали — выглядит
 * как обычный текст, никаких визуальных изменений по сравнению с раньше.
 */
const InlineEditableCell = ({
  value,
  onSave,
  displayLabel,
  emptyFallback = '—',
  multiline = false,
  expandable = false,
  options,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  textareaClassName = '',
  renderValue,
}: InlineEditableCellProps) => {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    if (options) selectRef.current?.focus();
    else if (multiline) textareaRef.current?.focus();
    else inputRef.current?.focus();
  }, [editing, multiline, options]);

  const commit = async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (trimmed === value.trim()) {
      setEditing(false);
      setExpanded(false);
      return;
    }
    if (required && !trimmed) {
      setDraft(value);
      setEditing(false);
      setExpanded(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
      setExpanded(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    setExpanded(false);
  };

  if (editing && options) {
    return (
      <select
        ref={selectRef}
        value={draft}
        disabled={saving}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        onBlur={cancel}
        onKeyDown={(e) => e.key === 'Escape' && cancel()}
        className={`h-9 rounded-md border border-input bg-background px-2 text-sm ${inputClassName}`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (multiline && expandable && expanded) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) commit(draft);
        }}
      >
        <DialogContent className="bg-card border-border sm:max-w-[560px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide text-xl">
              {displayLabel || 'Редактирование'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            ref={expandedTextareaRef}
            autoFocus
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && cancel()}
            className="bg-background min-h-[45vh] resize-none text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              className="font-head uppercase tracking-wide"
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => commit(draft)}
              className="font-head uppercase tracking-wide"
            >
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (editing && multiline) {
    return (
      <Textarea
        ref={textareaRef}
        value={draft}
        disabled={saving}
        readOnly={expandable}
        onClick={() => expandable && setExpanded(true)}
        onFocus={(e) => {
          if (!expandable) return;
          e.currentTarget.blur();
          setExpanded(true);
        }}
        onChange={(e) => !expandable && setDraft(e.target.value)}
        onBlur={(e) => !expandable && commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && cancel()}
        className={`min-h-32 text-xs resize-y ${expandable ? 'cursor-pointer' : ''} ${inputClassName} ${textareaClassName}`}
      />
    );
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Escape') {
            cancel();
          }
        }}
        className={`h-9 text-sm ${inputClassName}`}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={displayLabel ? `Изменить: ${displayLabel}` : undefined}
      onClick={() => {
        if (disabled) return;
        setEditing(true);
        if (multiline && expandable) setExpanded(true);
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setEditing(true);
          if (multiline && expandable) setExpanded(true);
        }
      }}
      className={`text-left ${multiline ? '' : 'inline-block'} rounded-sm -mx-1 px-1 hover:bg-muted/60 transition-colors cursor-pointer ${
        disabled ? 'cursor-default hover:bg-transparent' : ''
      } ${className}`}
    >
      {value ? (
        renderValue ? renderValue(value) : value
      ) : (
        <span className="text-muted-foreground">{emptyFallback}</span>
      )}
    </div>
  );
};

export default InlineEditableCell;