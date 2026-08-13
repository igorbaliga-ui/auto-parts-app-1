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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "ios" | "android";
};

const iosSteps = [
  "Откройте сайт запоптом.рф в браузере Safari (важно — именно Safari, не Chrome).",
  "Нажмите на иконку «Поделиться» внизу экрана — квадрат со стрелкой вверх.",
  "В открывшемся списке выберите «На экран Домой».",
  "Нажмите «Добавить» в правом верхнем углу.",
  "Готово — на главном экране появится значок ЗАП ОПТОМ, как обычное приложение.",
];

const androidSteps = [
  "Откройте сайт запоптом.рф в браузере Chrome.",
  "Нажмите на иконку ⬇ «Установить» рядом с названием сайта, либо на три точки в правом верхнем углу браузера.",
  "Выберите «Установить приложение» (или «Добавить на главный экран»).",
  "Подтвердите установку в появившемся окне.",
  "Готово — значок ЗАП ОПТОМ появится на главном экране и в списке приложений.",
];

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="flex flex-col gap-3 mt-4">
    {steps.map((s, i) => (
      <li key={i} className="flex gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary font-head font-bold flex items-center justify-center text-sm">
          {i + 1}
        </span>
        <span className="text-sm text-foreground/90 pt-0.5">{s}</span>
      </li>
    ))}
  </ol>
);

const InstallGuide = ({ open, onOpenChange, defaultTab = "ios" }: Props) => {
  const [tab, setTab] = useState<"ios" | "android">(defaultTab);

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
            <StepList steps={iosSteps} />
          </TabsContent>
          <TabsContent value="android">
            <StepList steps={androidSteps} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InstallGuide;
