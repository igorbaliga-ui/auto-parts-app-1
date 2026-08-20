import Icon from "@/components/ui/icon";
import { useRequest } from "./RequestDialog";

/** Лаконичный анимированный баннер внизу страницы: бонус за регистрацию
 * и повышенный кешбэк за приглашённого друга. Клик по кнопке открывает
 * ту же форму заявки, что и остальные CTA на сайте. */
const PromoBanner = () => {
  const { open } = useRequest();

  return (
    <section
      className="relative overflow-hidden border-y border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/10 py-10 sm:py-12"
      aria-label="Бонусная программа"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer-sweep"
        aria-hidden="true"
      />
      <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 shrink-0 rounded-full bg-primary/15 flex items-center justify-center animate-glow-pulse">
              <Icon name="Gift" className="text-primary" size={22} />
            </span>
            <p className="text-sm sm:text-base leading-snug">
              <span className="font-head font-bold uppercase tracking-wide text-foreground">
                500 бонусов
              </span>
              <span className="text-muted-foreground"> в подарок за регистрацию</span>
            </p>
          </div>

          <span className="hidden sm:block w-px h-10 bg-primary/25" aria-hidden="true" />

          <div className="flex items-center gap-3">
            <span className="w-12 h-12 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
              <Icon name="Users" className="text-primary" size={22} />
            </span>
            <p className="text-sm sm:text-base leading-snug">
              <span className="font-head font-bold uppercase tracking-wide text-foreground">
                +2% кешбэк
              </span>
              <span className="text-muted-foreground"> со всех заказов приглашённого друга</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => open()}
          className="shrink-0 bg-primary text-primary-foreground font-head font-bold uppercase tracking-[0.08em] text-sm px-6 py-3 rounded-sm hover:brightness-110 transition"
        >
          Оставить заявку
        </button>
      </div>
    </section>
  );
};

export default PromoBanner;
