import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type RequestSuccessMessageProps = {
  onClose: () => void;
};

const RequestSuccessMessage = ({ onClose }: RequestSuccessMessageProps) => (
  <div className="py-8 text-center flex flex-col items-center gap-4">
    <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
      <Icon name="Check" className="text-primary" size={30} />
    </div>
    <h3 className="font-head uppercase tracking-wide text-2xl">
      Заявка отправлена
    </h3>
    <p className="text-muted-foreground max-w-[30ch]">
      Спасибо! Подберём деталь по VIN и перезвоним в течение 15 минут.
    </p>
    <Button
      variant="secondary"
      className="mt-2 font-head uppercase tracking-wide"
      onClick={onClose}
    >
      Закрыть
    </Button>
  </div>
);

export default RequestSuccessMessage;
