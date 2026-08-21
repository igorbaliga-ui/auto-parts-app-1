import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type RequestPhoneVerificationStepProps = {
  phone: string;
  callRequested: boolean;
  callLoading: boolean;
  codeInput: string;
  setCodeInput: (v: string) => void;
  error: string;
  verifyLoading: boolean;
  cooldown: number;
  requestCall: () => void;
  submitCode: (e: React.FormEvent) => void;
  onBack: () => void;
};

/**
 * Компактный шаг подтверждения номера звонком — встраивается прямо в диалог
 * заявки (в отличие от CallVerificationView в «Гараже», которая занимает весь
 * экран). Заявка реально уходит в базу только после успешного ввода кода.
 */
const RequestPhoneVerificationStep = ({
  phone,
  callRequested,
  callLoading,
  codeInput,
  setCodeInput,
  error,
  verifyLoading,
  cooldown,
  requestCall,
  submitCode,
  onBack,
}: RequestPhoneVerificationStepProps) => (
  <form onSubmit={submitCode} className="flex flex-col gap-4 mt-2">
    <div className="flex justify-center">
      <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
        <Icon name="PhoneCall" className="text-primary" size={28} />
      </span>
    </div>
    {!callRequested ? (
      <p className="text-muted-foreground text-sm text-center">
        Прежде чем отправить заявку, подтвердите номер {phone}. Нажмите кнопку —
        мы позвоним, и нужно будет ввести последние 4 цифры номера, с которого
        поступит звонок.
      </p>
    ) : (
      <p className="text-muted-foreground text-sm text-center">
        Ждите звонка на номер {phone} и введите последние 4 цифры номера звонившего.
      </p>
    )}
    {callRequested && (
      <Input
        value={codeInput}
        onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
        maxLength={4}
        inputMode="numeric"
        placeholder="0000"
        className="text-center tracking-[0.4em] pr-[0.4em] text-lg"
        autoFocus
      />
    )}
    {error && <p className="text-primary text-sm text-center">{error}</p>}
    {!callRequested ? (
      <Button
        type="button"
        onClick={requestCall}
        disabled={callLoading}
        className="font-head uppercase tracking-wide h-11"
      >
        {callLoading ? 'Звоним…' : 'Позвонить мне'}
      </Button>
    ) : (
      <Button
        type="submit"
        disabled={verifyLoading || codeInput.length !== 4}
        className="font-head uppercase tracking-wide h-11"
      >
        {verifyLoading ? 'Проверяем…' : 'Подтвердить и отправить заявку'}
      </Button>
    )}
    {callRequested && (
      <button
        type="button"
        onClick={requestCall}
        disabled={cooldown > 0 || callLoading}
        className="text-center text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
      >
        {cooldown > 0 ? `Повторный звонок через ${cooldown} с` : 'Позвонить ещё раз'}
      </button>
    )}
    <button
      type="button"
      onClick={onBack}
      className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Назад к заявке
    </button>
  </form>
);

export default RequestPhoneVerificationStep;