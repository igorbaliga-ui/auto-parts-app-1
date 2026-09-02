import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import { isIosSafari, isAndroidChrome, isIosNonSafari, isAndroidNonChrome, getMobileOs } from "@/lib/browser-detect";
import { SITE_HOST } from "@/lib/site";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "ios" | "android";
};

// {SITE} — место, куда подставляется название сайта
const androidSteps = [
  "Откройте сайт {SITE} в браузере Chrome.",
  "Нажмите на иконку ⬇ «Установить» рядом с названием сайта, либо на три точки в правом верхнем углу браузера.",
  "Выберите «Установить приложение» ( «Добавить на главный экран» или «Установить и создать ярлык»).",
  "Подтвердите установку в появившемся окне.",
  "Готово — значок ЗАП ОПТОМ появится на главном экране и в списке приложений.",
];

// Упрощённая карточка для iOS: один крупный шаг вместо списка из 5 пунктов.
// Safari технически не даёт сайтам вызвать установку в один клик (в отличие
// от Android Chrome) — но сам единственный ручной шаг «Поделиться → На экран
// Домой» можно показать заметно и просто, без нумерованного списка.
const IosQuickStep = ({ showOpenSafari }: { showOpenSafari: boolean }) => (
  <div className="flex flex-col items-center gap-4 mt-4 py-2 text-center">
    {showOpenSafari && (
      <p className="text-sm text-muted-foreground">
        Откройте сайт в Safari, затем:
      </p>
    )}
    <div className="flex items-center gap-3 px-5 py-4 rounded-sm border border-primary/60 bg-primary/10 text-primary font-head font-bold uppercase tracking-wide">
      <Icon name="Share" size={22} />
      <Icon name="ArrowRight" size={16} className="opacity-60" />
      <Icon name="PlusSquare" size={22} />
      <span className="normal-case text-sm text-foreground/90 font-body font-medium">
        Поделиться → На экран Домой
      </span>
    </div>
    <p className="text-sm text-foreground/90 max-w-[32ch]">
      Нажмите на иконку «Поделиться» внизу экрана, выберите «На экран Домой» и
      подтвердите «Добавить» — готово.
    </p>
  </div>
);

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="flex flex-col gap-3 mt-4">
    {steps.map((s, i) => {
      const parts = s.split("{SITE}");
      return (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary font-head font-bold flex items-center justify-center text-sm">
            {i + 1}
          </span>
          <span className="text-sm text-foreground/90 pt-0.5">
            {parts.length === 2 ? (
              <>
                {parts[0]}
                {SITE_HOST}
                {parts[1]}
              </>
            ) : (
              s
            )}
          </span>
        </li>
      );
    })}
  </ol>
);

const CopySiteHost = ({ browser, icon }: { browser: string; icon: string }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE_HOST);
      toast({ title: "Адрес скопирован" });
    } catch {
      // буфер обмена недоступен — тихо игнорируем
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-4 py-2 text-center">
      <Icon name={icon} size={36} className="text-primary" />
      <p className="text-sm text-foreground/90">
        Для скачивания приложения перейдите в {browser}
      </p>
      <button
        type="button"
        onClick={copy}
        title="Скопировать адрес сайта"
        className="flex items-center gap-2 px-4 py-2.5 rounded-sm border border-primary/60 bg-primary/10 text-primary font-head font-bold uppercase tracking-wide text-base hover:bg-primary/20 transition-colors"
      >
        <Icon name="Copy" size={16} />
        {SITE_HOST}
      </button>
      <p className="text-xs text-muted-foreground">
        Скопируйте адрес и откройте его в {browser}
      </p>
    </div>
  );
};

const InstallGuide = ({ open, onOpenChange, defaultTab = "ios" }: Props) => {
  const [tab, setTab] = useState<"ios" | "android">(defaultTab);
  // Шаг «откройте сайт в нужном браузере» не нужен, если пользователь и так
  // уже в нём находится (Chrome на Android)
  const visibleAndroidSteps = isAndroidChrome() ? androidSteps.slice(1) : androidSteps;
  // Устройство уже однозначно определено (iPhone или Android) — инструкция для
  // другой платформы человеку не нужна и не показывается вовсе, вместе с
  // переключателем вкладок
  const detectedOs = getMobileOs();
  // На iOS вне Safari (Chrome, Yandex и т.д.) установка PWA технически невозможна —
  // вместо пошаговой инструкции просим переоткрыть сайт в Safari
  const iosNonSafari = isIosNonSafari();
  // На Android вне Chrome (Yandex, Samsung Internet и т.д.) установка PWA тоже
  // не гарантирована — просим переоткрыть сайт в Chrome
  const androidNonChrome = isAndroidNonChrome();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-head uppercase tracking-wide text-2xl">
            Установка приложения
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Наш сайт работает как приложение — установите его на телефон в один
            клик, без App Store и Google Play.
          </DialogDescription>
        </DialogHeader>

        {iosNonSafari ? (
          <CopySiteHost browser="Safari" icon="Compass" />
        ) : androidNonChrome ? (
          <CopySiteHost browser="Chrome" icon="Chrome" />
        ) : detectedOs === "ios" ? (
          <IosQuickStep showOpenSafari={!isIosSafari()} />
        ) : detectedOs === "android" ? (
          <StepList steps={visibleAndroidSteps} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "ios" | "android")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="ios" className="flex items-center gap-2">
                <Icon name="Apple" size={16} />
                iPhone
              </TabsTrigger>
              <TabsTrigger value="android" className="flex items-center gap-2">
                <Icon name="Smartphone" size={16} />
                Android
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ios">
              <IosQuickStep showOpenSafari={!isIosSafari()} />
            </TabsContent>
            <TabsContent value="android">
              <StepList steps={visibleAndroidSteps} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InstallGuide;