import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { CashbackHistoryItem, formatDate, formatBonus } from "./garageTypes";

type CashbackHistoryDialogProps = {
  history: CashbackHistoryItem[];
  cashbackPercent: number;
  referralPercent: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CashbackHistoryDialog = ({
  history,
  cashbackPercent,
  referralPercent,
  open,
  onOpenChange,
}: CashbackHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto [&>button]:focus:!ring-0 [&>button]:focus:!ring-offset-0">
        <DialogHeader>
          <DialogDescription className="pr-8">
            *Бонусами можно оплатить до 50% от суммы заказа. Минимальное
            списание 1000 бонусов.
          </DialogDescription>
          <DialogTitle>История бонусов</DialogTitle>
          <DialogDescription>
            Начисления за выполненные заказы и списания
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs text-primary">
              <Icon name="Percent" size={12} />
              {cashbackPercent}% с покупок
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs text-primary">
              <Icon name="Users" size={12} />
              {referralPercent}% с друзей
            </span>
          </div>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            Операций пока не было.
          </p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 border-l-2 pl-3 ${
                  h.type === "accrual"
                    ? "border-primary/40"
                    : "border-destructive/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={h.type === "accrual" ? "Plus" : "Minus"}
                    size={14}
                    className={
                      h.type === "accrual" ? "text-primary" : "text-destructive"
                    }
                  />
                  <div>
                    <p className="text-sm">{h.label}</p>
                    {h.created_at && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm font-head whitespace-nowrap ${
                    h.type === "accrual" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {h.type === "accrual" ? "+" : "−"}
                  {formatBonus(h.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CashbackHistoryDialog;
