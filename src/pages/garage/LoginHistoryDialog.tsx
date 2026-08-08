import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { LoginHistoryItem, formatDate } from './garageTypes';

type LoginHistoryDialogProps = {
  history: LoginHistoryItem[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LoginHistoryDialog = ({ history, loading, open, onOpenChange }: LoginHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История входов</DialogTitle>
          <DialogDescription>Когда и с какого устройства заходили в личный кабинет</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Входов пока не было.</p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 border-l-2 pl-3 ${
                  h.login_type === 'reset_password' ? 'border-primary/40' : 'border-steel'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={h.login_type === 'reset_password' ? 'KeyRound' : 'LogIn'}
                    size={14}
                    className={h.login_type === 'reset_password' ? 'text-primary' : 'text-muted-foreground'}
                  />
                  <div>
                    <p className="text-sm">
                      {h.login_type === 'reset_password' ? 'Восстановление пароля' : 'Обычный вход'}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.device}</p>
                  </div>
                </div>
                {h.created_at && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(h.created_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginHistoryDialog;
