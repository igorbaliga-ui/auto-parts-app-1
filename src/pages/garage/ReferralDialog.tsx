import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { ReferralFriend, formatBonus } from "./garageTypes";

type ReferralDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string | null;
  referralBonusTotal: number;
  referrals: ReferralFriend[];
  referredByName: string | null;
  applyReferralCode: (code: string) => Promise<boolean>;
  applyingReferralCode: boolean;
  applyReferralCodeError: string;
  setApplyReferralCodeError: (error: string) => void;
};

const ReferralDialog = ({
  open,
  onOpenChange,
  referralCode,
  referralBonusTotal,
  referrals,
  referredByName,
  applyReferralCode,
  applyingReferralCode,
  applyReferralCodeError,
  setApplyReferralCodeError,
}: ReferralDialogProps) => {
  const [promoInput, setPromoInput] = useState("");

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

  const submitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const ok = await applyReferralCode(promoInput.trim());
    if (ok) {
      setPromoInput("");
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

        {/* Промокод друга: если клиент не указал его в форме заявки, можно ввести здесь —
            но только один раз, дальше поле показывает, чей промокод уже применён */}
        {referredByName ? (
          <div className="flex items-center gap-2 border-t border-steel pt-3 mt-1">
            <Icon name="CheckCircle2" size={16} className="text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">
              Вы воспользовались промокодом друга: <span className="text-foreground">{referredByName}</span>
            </span>
          </div>
        ) : (
          <form onSubmit={submitPromo} className="flex flex-col gap-2 border-t border-steel pt-3 mt-1">
            <span className="text-muted-foreground text-xs uppercase tracking-[0.1em]">
              Есть промокод друга?
            </span>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                  if (applyReferralCodeError) setApplyReferralCodeError("");
                }}
                maxLength={10}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                placeholder="Например, X7K9QZ"
                className="bg-background tracking-[0.14em] uppercase"
              />
              <Button
                type="submit"
                size="sm"
                disabled={applyingReferralCode || !promoInput.trim()}
                className="font-head uppercase tracking-wide text-xs shrink-0"
              >
                {applyingReferralCode ? "Применяем…" : "Применить"}
              </Button>
            </div>
            {applyReferralCodeError && (
              <p className="text-primary text-xs">{applyReferralCodeError}</p>
            )}
          </form>
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
