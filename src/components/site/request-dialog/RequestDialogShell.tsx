import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

type RequestDialogShellProps = {
  isMobile: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  verificationStep: boolean;
  children: ReactNode;
};

/** Обёртка Dialog (десктоп) / Drawer (мобильный) с заголовком, зависящим от текущего шага. */
const RequestDialogShell = ({ isMobile, isOpen, setIsOpen, verificationStep, children }: RequestDialogShellProps) => {
  const title = verificationStep ? 'Подтверждение номера' : 'Заявка на подбор';
  const description = verificationStep
    ? 'Осталось подтвердить номер телефона.'
    : 'Оставьте VIN и контакты — найдём деталь и сообщим цену.';

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={setIsOpen}
        repositionInputs={false}
        shouldScaleBackground={false}
        handleOnly
      >
        <DrawerContent className="bg-card border-border max-h-[85vh]">
          <div className="overflow-y-auto px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="font-head uppercase tracking-wide text-2xl">
                {title}
              </DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                {description}
              </DrawerDescription>
            </DrawerHeader>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-card border-border sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-head uppercase tracking-wide text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default RequestDialogShell;