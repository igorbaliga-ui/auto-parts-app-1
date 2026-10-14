import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useIsStandalone } from "@/hooks/use-standalone";
import { useIsMobileOs } from "@/hooks/use-mobile-os";
import { getMobileOs } from "@/lib/browser-detect";
import { safeGetItem, safeGetSession, safeSetSession } from "@/lib/storage";
import InstallGuide from "./InstallGuide";

const DISMISSED_KEY = "install-banner-dismissed";
const IOS_INSTALLED_KEY = "ios-installed";

const InstallAppBanner = () => {
  const isMobileOs = useIsMobileOs();
  const isStandalone = useIsStandalone();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => safeGetSession(DISMISSED_KEY) === "1");
  const [guideOpen, setGuideOpen] = useState(false);

  const os = getMobileOs();
  const alreadyInstalled =
    os === "ios" ? safeGetItem(IOS_INSTALLED_KEY) === "1" : installed;

  if (!isMobileOs || isStandalone || alreadyInstalled || dismissed) return null;

  const dismiss = () => {
    safeSetSession(DISMISSED_KEY, "1");
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
      <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:hidden animate-fade-in-slow">
        <div className="relative flex items-center gap-3 rounded-sm border border-primary/60 bg-card/95 backdrop-blur p-3 pr-9 shadow-lg shadow-black/40">
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="Smartphone" className="text-primary" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground leading-tight">
              Установите приложение ЗАП ОПТОМ
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Быстрый доступ и уведомления о заказах
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            className="font-head uppercase tracking-wide text-xs shrink-0"
          >
            Скачать
          </Button>
          <button
            onClick={dismiss}
            aria-label="Закрыть"
            className="absolute top-1.5 right-1.5 p-1 text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={14} />
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
