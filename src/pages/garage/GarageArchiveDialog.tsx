import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Order, messengerLabel, formatDate, formatMoney } from './garageTypes';

type GarageArchiveDialogProps = {
  orders: Order[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const GarageArchiveDialog = ({ orders, open, onOpenChange }: GarageArchiveDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Archive" size={18} />
            Архив заявок
          </DialogTitle>
          <DialogDescription>
            Заявки, не взятые в работу дольше 14 дней, автоматически попадают сюда.
          </DialogDescription>
        </DialogHeader>
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">В архиве пока пусто.</p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {orders.map((o) => (
              <div key={o.id} className="border border-steel rounded-sm p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-head tracking-[0.08em] text-sm">
                    {o.vin || o.car_name || 'VIN не указан'}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatDate(o.created_at)}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {o.messenger ? (messengerLabel[o.messenger] ?? o.messenger) : ''}
                  {o.city ? ` · ${o.city}` : ''}
                </p>
                {o.order_amount != null && (
                  <p className="text-sm mt-1">{formatMoney(o.order_amount)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GarageArchiveDialog;
