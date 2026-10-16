import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useIsStandalone } from "@/hooks/use-standalone";
import { useIsMobileOs } from "@/hooks/use-mobile-os";
import { getMobileOs } from "@/lib/browser-detect";
import { safeGetItem, safeSetItem, safeGetSession, safeSetSession } from "@/lib/storage";
import InstallGuide from "./InstallGuide";
import { GARAGE_LOOKUP_URL } from "./request-dialog/RequestContext";

const DISMISSED_KEY = "install-banner-dismissed";
const IOS_INSTALLED_KEY = "ios-installed";
const PWA_INSTALLED_KEY = "pwa-installed";
const IOS_DISMISSED_DAY_KEY = "install-banner-dismissed-day";

const todayKey = () => new Date().toLocaleDateString("sv-SE");

const InstallAppBanner = () => {
  const isMobileOs = useIsMobileOs();
  const isStandalone = useIsStandalone();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () =>
      safeGetSession(DISMISSED_KEY) === "1" ||
      (getMobileOs() === "ios" && safeGetItem(IOS_DISMISSED_DAY_KEY) === todayKey()),
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [signupBonus, setSignupBonus] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?signup_bonus=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.signup_bonus_amount === "number") {
          setSignupBonus(data.signup_bonus_amount);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const os = getMobileOs();
  const alreadyInstalled =
    installed ||
    (os === "android" ? !canInstall : safeGetItem(IOS_INSTALLED_KEY) === "1");

  useEffect(() => {
    if (isStandalone) {
      safeSetItem(IOS_INSTALLED_KEY, "1");
      safeSetItem(PWA_INSTALLED_KEY, "1");
    }
  }, [isStandalone]);

  if (!isMobileOs || isStandalone || alreadyInstalled || dismissed) return null;

  const dismiss = () => {
    safeSetSession(DISMISSED_KEY, "1");
    if (os === "ios") safeSetItem(IOS_DISMISSED_DAY_KEY, todayKey());
    setDismissed(true);
  };

  const handleInstall = () => {
    if (os === "android" && canInstall) {
      promptInstall();
      return;
    }
    setGuideOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 sm:hidden animate-fade-in-slow">
        <div className="relative flex w-full max-w-xs flex-col items-center gap-4 rounded-sm border border-primary/60 bg-card p-6 text-center shadow-lg shadow-black/40">
          <span className="w-14 h-14 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="Smartphone" className="text-primary" size={26} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-medium text-foreground leading-tight">
              Установите приложение
              <span className="block whitespace-nowrap text-primary font-head uppercase tracking-wide mt-1">
                ЗАП ОПТОМ
              </span>
            </p>
            {signupBonus > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary leading-tight">
                <Icon name="Gift" size={15} />
                {signupBonus % 1 === 0 ? signupBonus : signupBonus.toFixed(2)} бонусов в подарок за регистрацию
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-tight mt-1.5">
              Быстрый доступ и уведомления о заказах
            </p>
          </div>
          <Button
            onClick={handleInstall}
            className="w-full font-head uppercase tracking-wide"
          >
            Скачать
          </Button>
          <button
            onClick={dismiss}
            aria-label="Закрыть"
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>
      {guideOpen && (
        <InstallGuide
          key={os}
          open={guideOpen}
          onOpenChange={setGuideOpen}
          defaultTab={os === "android" ? "android" : "ios"}
        />
      )}
    </>
  );
};

export default InstallAppBanner;