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
import { toast } from "@/hooks/use-toast";
import { getStoredReferralCode } from "@/lib/referral";
import {
  isIosSafari,
  isAndroidChrome,
  isSafariBrowser,
  getMobileOs,
  toAndroidChromeIntentUrl,
} from "@/lib/browser-detect";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "ios" | "android";
};

const SITE_HOST = "запоптом.рф";

// {SITE} — место, куда подставляется название сайта (обычным текстом или
// ссылкой с реферальным кодом, если человек пришёл по ссылке друга)
const iosSteps = [
  "Откройте сайт {SITE} в браузере Safari (важно — именно Safari, не Chrome).",
  "Нажмите на иконку «Поделиться» внизу экрана — квадрат со стрелкой вверх.",
  "В открывшемся списке выберите «На экран Домой».",
  "Нажмите «Добавить» в правом верхнем углу.",
  "Готово — на главном экране появится значок ЗАП ОПТОМ, как обычное приложение.",
];

const androidSteps = [
  "Откройте сайт {SITE} в браузере Chrome.",
  "Нажмите на иконку ⬇ «Установить» рядом с названием сайта, либо на три точки в правом верхнем углу браузера.",
  "Выберите «Установить приложение» ( «Добавить на главный экран» или «Установить и создать ярлык»).",
  "Подтвердите установку в появившемся окне.",
  "Готово — значок ЗАП ОПТОМ появится на главном экране и в списке приложений.",
];

const copySiteText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "Скопировано" });
  } catch {
    // буфер обмена недоступен — тихо игнорируем
  }
};

const StepList = ({
  steps,
  siteHref,
  copyHref,
}: {
  steps: string[];
  siteHref: string | null;
  copyHref: string | null;
}) => (
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
                {siteHref ? (
                  <a
                    href={siteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {SITE_HOST}
                  </a>
                ) : (
                  SITE_HOST
                )}
                <button
                  type="button"
                  onClick={() => copySiteText(copyHref || SITE_HOST)}
                  aria-label="Скопировать адрес сайта"
                  title="Скопировать"
                  className="inline-flex align-middle ml-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Icon name="Copy" size={14} />
                </button>
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

const InstallGuide = ({ open, onOpenChange, defaultTab = "ios" }: Props) => {
  const [tab, setTab] = useState<"ios" | "android">(defaultTab);
  // Если человек пришёл по ссылке друга (код сохранён в localStorage) — в инструкции
  // показываем «запоптом.рф» той же реферальной ссылкой, чтобы код не потерялся
  // после установки приложения. Только в браузерах, где это безопасно кликнуть
  // прямо в шаге инструкции (не Safari — там первый шаг «откройте сайт»
  // подразумевает переход в Safari, а ссылка открылась бы в текущем браузере,
  // не в нужном). Зашедшим напрямую без кода друга — ссылку не подставляем.
  const referralCode = getStoredReferralCode();
  const rawReferralUrl = referralCode ? `https://запоптом.рф/?ref=${referralCode}` : null;
  // На Android, если человек ещё не в Chrome — ссылка принудительно открывает
  // именно Chrome (через intent://), чтобы дальнейшая установка приложения
  // происходила в том же браузере, где закрепился реферальный код
  const siteHref = !rawReferralUrl
    ? null
    : isSafariBrowser()
      ? null
      : getMobileOs() === "android" && !isAndroidChrome()
        ? toAndroidChromeIntentUrl(rawReferralUrl)
        : rawReferralUrl;
  // Шаг «откройте сайт в нужном браузере» не нужен, если пользователь и так
  // уже в нём находится (Safari на iOS / Chrome на Android)
  const visibleIosSteps = isIosSafari() ? iosSteps.slice(1) : iosSteps;
  const visibleAndroidSteps = isAndroidChrome() ? androidSteps.slice(1) : androidSteps;
  // Устройство уже однозначно определено (iPhone или Android) — инструкция для
  // другой платформы человеку не нужна и не показывается вовсе, вместе с
  // переключателем вкладок
  const detectedOs = getMobileOs();

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

        {detectedOs ? (
          <StepList
            steps={detectedOs === "ios" ? visibleIosSteps : visibleAndroidSteps}
            siteHref={siteHref}
            copyHref={rawReferralUrl}
          />
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
              <StepList steps={visibleIosSteps} siteHref={siteHref} copyHref={rawReferralUrl} />
            </TabsContent>
            <TabsContent value="android">
              <StepList steps={visibleAndroidSteps} siteHref={siteHref} copyHref={rawReferralUrl} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InstallGuide;