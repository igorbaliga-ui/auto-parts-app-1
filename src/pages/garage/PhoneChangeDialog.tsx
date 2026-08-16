import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { normalizePhoneInput } from '@/lib/phone';

type PhoneChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: 'input' | 'call';
  newPhone: string;
  setNewPhone: (v: string) => void;
  callRequested: boolean;
  callLoading: boolean;
  codeInput: string;
  setCodeInput: (v: string) => void;
  verifyLoading: boolean;
  cooldown: number;
  error: string;
  requestCall: () => void;
  submitCode: (e: React.FormEvent) => void;
  backToInput: () => void;
};

const PhoneChangeDialog = ({
  open,
  onOpenChange,
  step,
  newPhone,
  setNewPhone,
  callRequested,
  callLoading,
  codeInput,
  setCodeInput,
  verifyLoading,
  cooldown,
  error,
  requestCall,
  submitCode,
  backToInput,
}: PhoneChangeDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-card border-border sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle className="font-head uppercase tracking-wide text-xl">
          Смена номера телефона
        </DialogTitle>
        <DialogDescription>
          {step === 'input'
            ? 'Все ваши заказы, бонусы и история перенесутся на новый номер.'
            : 'Подтвердите новый номер звонком.'}
        </DialogDescription>
      </DialogHeader>

      {step === 'input' ? (
        <div className="flex flex-col gap-3 mt-1">
          <div>
            <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
              Новый номер телефона
            </label>
            <Input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(normalizePhoneInput(newPhone, e.target.value))}
              maxLength={12}
              placeholder="+7 900 000-00-00"
              className="mt-1.5 bg-background"
              autoFocus
            />
          </div>
          {error && <p className="text-primary text-sm">{error}</p>}
          <Button
            type="button"
            onClick={requestCall}
            disabled={callLoading}
            className="font-head uppercase tracking-wide h-11 mt-1"
          >
            {callLoading ? 'Звоним…' : 'Позвонить и подтвердить'}
          </Button>
        </div>
      ) : (
        <form onSubmit={submitCode} className="flex flex-col gap-4 mt-1">
          <div className="flex justify-center">
            <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
              <Icon name="PhoneCall" className="text-primary" size={28} />
            </span>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            Ждите звонка на номер {newPhone} и введите последние 4 цифры номера звонившего.
          </p>
          {callRequested && (
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
              placeholder="0000"
              className="text-center tracking-[0.4em] text-lg"
              autoFocus
            />
          )}
          {error && <p className="text-primary text-sm text-center">{error}</p>}
          <Button
            type="submit"
            disabled={verifyLoading || codeInput.length !== 4}
            className="font-head uppercase tracking-wide h-11"
          >
            {verifyLoading ? 'Проверяем…' : 'Подтвердить смену номера'}
          </Button>
          <button
            type="button"
            onClick={requestCall}
            disabled={cooldown > 0 || callLoading}
            className="text-center text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Повторный звонок через ${cooldown} с` : 'Позвонить ещё раз'}
          </button>
          <button
            type="button"
            onClick={backToInput}
            className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ввести другой номер
          </button>
        </form>
      )}
    </DialogContent>
  </Dialog>
);

export default PhoneChangeDialog;
