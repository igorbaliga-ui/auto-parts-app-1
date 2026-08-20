import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { GARAGE_LOOKUP_URL } from "./request-dialog/RequestContext";

type PromoSettings = {
  signup_bonus_amount: number;
  default_cashback_percent: number;
  default_referral_percent: number;
};

const formatPercent = (n: number) =>
  n % 1 === 0
    ? n.toFixed(0)
    : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

/** Лаконичный баннер бонусной программы: кешбэк с заказов, бонус за регистрацию и
 * повышенный кешбэк за приглашённого друга. Все значения задаются менеджером в
 * /admin («Бонусы клиентов») — баннер сам подхватывает актуальные цифры.
 * На мобильных — бегущая строка с мягкой анимированной подсветкой, на десктопе —
 * статичная строка, приподнятая так, чтобы поместиться на экране без прокрутки. */
const PromoBanner = () => {
  const [settings, setSettings] = useState<PromoSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?signup_bonus=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setSettings({
            signup_bonus_amount:
              typeof data.signup_bonus_amount === "number"
                ? data.signup_bonus_amount
                : 0,
            default_cashback_percent:
              typeof data.default_cashback_percent === "number"
                ? data.default_cashback_percent
                : 3,
            default_referral_percent:
              typeof data.default_referral_percent === "number"
                ? data.default_referral_percent
                : 2,
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
      text: "со всех заказов приглашенных друзей",
    },
  ];

  return (
    <section
      className="relative overflow-hidden border-y border-border/60 bg-card/40 -mt-10 sm:-mt-14 lg:-mt-16"
      aria-label="Бонусная программа"
    >
      {/* мягкая анимированная подсветка, медленно проходящая по всей полосе */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-sm animate-shimmer-sweep"
        aria-hidden="true"
      />

      {/* Мобильная версия: бегущая строка, повторяется бесконечно */}
      <div className="sm:hidden relative overflow-hidden py-2.5">
        <div className="flex w-max animate-marquee">
          {[...items, ...items].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 pr-6 text-[11px] leading-none whitespace-nowrap shrink-0"
            >
              <Icon
                name={item.icon}
                size={12}
                className="text-primary shrink-0"
              />
              <span className="font-head font-semibold uppercase tracking-wide text-foreground">
                {item.title}
              </span>
              <span className="text-muted-foreground">{item.text}</span>
              <span className="text-primary/40 pl-6" aria-hidden="true">
                •
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Версия для планшета/десктопа: статичная строка */}
      <div className="hidden sm:flex relative max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-3 lg:py-4 flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
        {items.map((item, i) => (
          <div key={item.icon} className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <Icon
                name={item.icon}
                className="text-primary shrink-0"
                size={14}
              />
              <p className="text-xs leading-snug text-left">
                <span className="font-head font-semibold uppercase tracking-wide text-foreground">
                  {item.title}
                </span>
                <span className="text-muted-foreground"> {item.text}</span>
              </p>
            </div>
            {i < items.length - 1 && (
              <span
                className="hidden sm:block w-px h-3 bg-border"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoBanner;
