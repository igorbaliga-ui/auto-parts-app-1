import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ExpandableTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  className?: string;
};

/**
 * Textarea, которая по клику открывает большое окно для комфортного ввода
 * длинного текста (как поле «Интересующие запчасти» в заявке клиента).
 * Сама по себе ничего не сохраняет на сервер — просто удобно меняет value,
 * сохранение делает родитель (например по кнопке «Сохранить»).
 */
const ExpandableTextarea = ({
  value,
  onChange,
  title = 'Редактирование',
  placeholder,
  className = '',
}: ExpandableTextareaProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Textarea
        value={value}
        readOnly
        onClick={() => setExpanded(true)}
        onFocus={(e) => {
          e.currentTarget.blur();
          setExpanded(true);
        }}
        placeholder={placeholder}
        className={`cursor-pointer resize-none ${className}`}
      />
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="bg-card border-border sm:max-w-[560px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide text-xl">
              {title}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-background min-h-[45vh] resize-none text-sm"
          />
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-head uppercase tracking-wide"
            >
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpandableTextarea;
