import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { ReferralFriend, formatBonus } from "./garageTypes";

type ReferralDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string | null;
  referralBonusTotal: number;
  referrals: ReferralFriend[];
};

const ReferralDialog = ({
  open,
  onOpenChange,
  referralCode,
  referralBonusTotal,
  referrals,
}: ReferralDialogProps) => {
  const shareText = referralCode
    ? `Промокод ${referralCode} даёт мне бонус при заказе на ЗАП ОПТОМ. Оставь заявку на запоптом.рф и укажи этот промокод при оформлении`
    : "";

  const shareCode = async () => {
    if (!referralCode) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ЗАП ОПТОМ", text: shareText });
        return;
      }
      await navigator.clipboard.writeText(referralCode);
      toast({ title: "Промокод скопирован" });
    } catch {
      // пользователь отменил шаринг — ничего не делаем
    }
  };

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: "Промокод скопирован" });
    } catch {
      // буфер обмена недоступен — тихо игнорируем
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-head uppercase tracking-wide text-xl">
            Пригласи друга
          </DialogTitle>
          <DialogDescription>
            Дайте другу свой промокод — пусть укажет его при оформлении первой
            заявки. Друг получает те же условия, а вы — 2% от суммы каждого
            его выполненного заказа сверх обычных бонусов.
          </DialogDescription>
        </DialogHeader>

        {referralCode ? (
          <div className="flex flex-col items-center gap-3 bg-muted rounded-sm px-4 py-5">
            <span className="text-muted-foreground text-xs uppercase tracking-[0.1em]">
              Ваш промокод
            </span>
            <button
              type="button"
              onClick={copyCode}
              title="Скопировать промокод"
              className="font-head font-bold text-3xl tracking-[0.2em] text-primary hover:opacity-80 transition-opacity"
            >
              {referralCode}
            </button>
            <Button
              type="button"
              size="sm"
              onClick={shareCode}
              className="font-head uppercase tracking-wide text-xs w-full"
            >
              <Icon name="Share2" size={14} className="mr-1.5" />
              Поделиться промокодом
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Загружаем ваш промокод…</p>
        )}

        <div className="flex items-center justify-between border-t border-steel pt-3 mt-1">
          <span className="text-muted-foreground text-xs uppercase tracking-[0.1em]">
            Заработано на друзьях
          </span>
          <span className="font-head text-lg text-primary">
            {formatBonus(referralBonusTotal)}
          </span>
        </div>

        {referrals.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {referrals.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-l-2 border-primary/40 pl-3"
              >
                <div>
                  <p className="text-sm">{f.name || "Друг"}</p>
                  <p className="text-xs text-muted-foreground">
                    Выполненных заказов: {f.done_orders}
                  </p>
                </div>
                <span className="text-sm font-head text-primary whitespace-nowrap">
                  +{formatBonus(f.bonus_earned)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;
