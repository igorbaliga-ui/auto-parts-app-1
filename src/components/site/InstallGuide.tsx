import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import InstallGuideContent from "./InstallGuideContent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "ios" | "android";
};

const InstallGuide = ({ open, onOpenChange, defaultTab = "ios" }: Props) => (
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
      <InstallGuideContent defaultTab={defaultTab} />
    </DialogContent>
  </Dialog>
);

export default InstallGuide;
