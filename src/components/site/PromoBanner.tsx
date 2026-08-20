import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { GARAGE_LOOKUP_URL } from "./request-dialog/RequestContext";

type PromoSettings = {
  signup_bonus_amount: number;
  default_cashback_percent: number;
  default_referral_percent: number;
};

const formatPercent = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));

/** Лаконичный анимированный баннер внизу страницы: кешбэк с заказов, бонус за
 * регистрацию и повышенный кешбэк за приглашённого друга. Все значения задаются
 * менеджером в /admin («Бонусы клиентов») — баннер сам подхватывает актуальные цифры. */
const PromoBanner = () => {
  const [settings, setSettings] = useState<PromoSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?signup_bonus=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setSettings({
            signup_bonus_amount: typeof data.signup_bonus_amount === "number" ? data.signup_bonus_amount : 0,
            default_cashback_percent: typeof data.default_cashback_percent === "number" ? data.default_cashback_percent : 3,
            default_referral_percent: typeof data.default_referral_percent === "number" ? data.default_referral_percent : 2,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return null;

  const items = [
    {
      icon: "Percent",
      title: `Кешбэк ${formatPercent(settings.default_cashback_percent)}%`,
      text: "от ваших заказов",
    },
    ...(settings.signup_bonus_amount > 0
      ? [
          {
            icon: "Gift",
            title: `${settings.signup_bonus_amount % 1 === 0 ? settings.signup_bonus_amount : settings.signup_bonus_amount.toFixed(2)} бонусов`,
            text: "в подарок за регистрацию",
          },
        ]
      : []),
    {
      icon: "Users",
      title: `+${formatPercent(settings.default_referral_percent)}% кешбэк`,
      text: "со всех заказов приглашённого друга",
    },
  ];

  return (
    <section
      className="border-y border-border/60 bg-card/40 py-3 sm:py-4"
      aria-label="Бонусная программа"
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
        {items.map((item, i) => (
          <div key={item.icon} className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <Icon name={item.icon} className="text-primary shrink-0" size={14} />
              <p className="text-xs leading-snug text-center sm:text-left">
                <span className="font-head font-semibold uppercase tracking-wide text-foreground">
                  {item.title}
                </span>
                <span className="text-muted-foreground"> {item.text}</span>
              </p>
            </div>
            {i < items.length - 1 && (
              <span className="hidden sm:block w-px h-3 bg-border" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoBanner;