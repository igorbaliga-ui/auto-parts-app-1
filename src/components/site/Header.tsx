import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useIsStandalone } from "@/hooks/use-standalone";
import { useIsMobileOs } from "@/hooks/use-mobile-os";
import { useNav, Tab } from "@/components/site/NavContext";
import { useGarageAuth } from "@/hooks/use-garage-auth";
import { useGarageArrived } from "@/hooks/use-garage-arrived";
import { useGarageReferralCode } from "@/hooks/use-garage-referral-code";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { SITE_URL } from "@/lib/site";
import InstallGuide from "./InstallGuide";

const INSTALL_HINT_SEEN_KEY = "install-hint-seen";

const links: { label: string; tab: Tab }[] = [
  { label: "Как заказать", tab: "how" },
  { label: "Преимущества", tab: "advantages" },
  { label: "Контакты", tab: "contacts" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();
  const isStandalone = useIsStandalone();
  const isMobileOs = useIsMobileOs();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<"ios" | "android">("ios");
  const [installHint, setInstallHint] = useState(
    () => safeGetItem(INSTALL_HINT_SEEN_KEY) !== "1",
  );
  const { goTo } = useNav();
  const { authed: garageAuthed } = useGarageAuth();
  const hasArrived = useGarageArrived();
  const referralCode = useGarageReferralCode();

  const dismissInstallHint = () => {
    setInstallHint(false);
    safeSetItem(INSTALL_HINT_SEEN_KEY, "1");
  };

  const openGuide = (tab: "ios" | "android") => {
    setOpen(false);
    dismissInstallHint();
    setGuideTab(tab);
    setGuideOpen(true);
  };

  const navigate = (tab: Tab) => {
    setOpen(false);
    goTo(tab);
  };

  const handleShare = async () => {
    setOpen(false);
    // Та же ссылка и текст, что и в кнопке «Поделиться промокодом» в «Гараже» —
    // клиент делится своим персональным промокодом, а не просто ссылкой на сайт
    const shareText = referralCode
      ? `Промокод ${referralCode} даёт мне бонус при заказе на ЗАП ОПТОМ. Оставь заявку на запоптом.рф и укажи этот промокод при оформлении`
      : "Подбор автозапчастей по VIN-коду — ЗАП ОПТОМ";
    const shareData = referralCode
      ? { title: "ЗАП ОПТОМ", text: shareText }
      : { title: "ЗАП ОПТОМ", text: shareText, url: SITE_URL };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // пользователь отменил — ничего не делаем
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(referralCode || SITE_URL);
    }
  };

  return (
    <header
      className="absolute top-0 left-0 right-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center px-5 sm:px-8 lg:px-12 py-6">
        <button onClick={() => navigate("home")} className="flex items-center">
          <span className="font-head font-bold uppercase tracking-[0.18em] text-lg sm:text-xl text-concrete-carved">
            ЗАП&nbsp;ОПТОМ
          </span>
        </button>

        {isStandalone ? (
          garageAuthed && (
            <button
              onClick={handleShare}
              aria-label="Поделиться промокодом"
              title="Поделиться промокодом"
              className="flex items-center justify-center w-9 h-9 ml-4 rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors animate-share-glow"
            >
              <Icon name="Share2" size={16} />
            </button>
          )
        ) : isMobileOs ? (
          <div className="relative ml-4">
            {installHint && (
              <div
                role="button"
                tabIndex={-1}
                onClick={dismissInstallHint}
                className="absolute top-full mt-2 whitespace-nowrap px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[0.68rem] font-head font-bold uppercase tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.35)] ring-1 ring-primary/40 cursor-pointer animate-[fade-in_0.5s_ease-out_both,glow-pulse_2s_ease-in-out_0.5s_infinite] z-10"
                style={{ left: "-2.5rem" }}
              >
                Нажмите для скачивания приложения
                <span
                  className="absolute -top-1 w-2 h-2 bg-primary rotate-45"
                  style={{ left: "2.75rem" }}
                />
              </div>
            )}
            <div
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-full border border-border/60 bg-card/40 ${installHint ? "animate-glow-pulse" : ""}`}
              style={{
                boxShadow:
                  "inset 0 2px 4px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <button
                onClick={() => openGuide("ios")}
                aria-label="Установить на iPhone"
                title="Установить на iPhone"
                className="flex items-center justify-center w-8 h-8 text-slate-200 hover:text-white hover:scale-110 transition-all"
              >
                <Icon name="Apple" size={17} />
              </button>
              <button
                onClick={() => openGuide("android")}
                aria-label="Установить на Android"
                title="Установить на Android"
                className="flex items-center justify-center w-8 h-8 text-[#3DDC84] hover:brightness-125 hover:scale-110 transition-all"
              >
                <Icon name="Smartphone" size={17} />
              </button>
            </div>
          </div>
        ) : null}

        {!isStandalone && isMobileOs && (
          <InstallGuide
            key={guideTab}
            open={guideOpen}
            onOpenChange={setGuideOpen}
            defaultTab={guideTab}
          />
        )}
        {canInstall && (
          <button
            onClick={promptInstall}
            aria-label="Установить приложение"
            title="Установить приложение"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-sm border border-primary/60 text-primary hover:bg-primary/10 transition-colors"
          >
            <Icon name="Download" size={16} />
          </button>
        )}

        <nav className="hidden md:flex items-center gap-8 ml-auto">
          {links.map((l) => (
            <button
              key={l.tab}
              onClick={() => navigate(l.tab)}
              className="font-head font-medium uppercase tracking-[0.14em] text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/garage"
            className={`relative flex items-center gap-1.5 font-head font-medium uppercase tracking-[0.14em] text-xs transition-colors ${
              garageAuthed
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            <span className="relative">
              <Icon name="Warehouse" size={14} />
              {hasArrived ? (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border border-background" />
              ) : (
                garageAuthed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary border border-background" />
                )
              )}
            </span>
            Гараж
            {garageAuthed && (
              <span className="flex items-center gap-1 text-[0.65rem] normal-case tracking-normal text-primary/80">
                <Icon name="Check" size={11} />
                Вы вошли
              </span>
            )}
          </Link>
        </nav>

        <div className="md:hidden flex items-center gap-3 ml-auto">
          <Link
            to="/garage"
            aria-label={garageAuthed ? "Гараж — вы вошли" : "Гараж"}
            title={garageAuthed ? "Гараж — вы вошли" : "Гараж"}
            className={`relative flex items-center justify-center w-9 h-9 transition-colors ${
              garageAuthed
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            <Icon name="Warehouse" size={22} />
            {hasArrived ? (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 border border-background" />
            ) : (
              garageAuthed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border border-background" />
              )
            )}
          </Link>
          <button
            className="text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            <Icon name={open ? "X" : "Menu"} size={26} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-card/95 backdrop-blur border-y border-border animate-fade-in">
          <nav className="flex flex-col px-5 py-4">
            {links.map((l) => (
              <button
                key={l.tab}
                onClick={() => navigate(l.tab)}
                className="text-left font-head font-medium uppercase tracking-[0.14em] text-sm text-muted-foreground hover:text-foreground py-3 border-b border-border/50 last:border-0"
              >
                {l.label}
              </button>
            ))}
            {canInstall && (
              <button
                onClick={() => {
                  setOpen(false);
                  promptInstall();
                }}
                className="flex items-center gap-2 text-left font-head font-medium uppercase tracking-[0.14em] text-sm text-primary py-3"
              >
                <Icon name="Download" size={16} />
                Установить приложение
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;