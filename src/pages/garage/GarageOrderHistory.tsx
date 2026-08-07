import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Icon from "@/components/ui/icon";
import { Order, formatDate } from "./garageTypes";

type GarageOrderHistoryProps = {
  order: Order;
};

type Step = {
  label: string;
  date: string | null;
  icon: string;
};

const GarageOrderHistory = ({ order }: GarageOrderHistoryProps) => {
  const steps: Step[] = [
    { label: "Заявка создана", date: order.created_at, icon: "FilePlus" },
    { label: "Взят в работу", date: order.in_progress_at, icon: "Wrench" },
    { label: "Деталь поступила", date: order.arrived_at, icon: "PackageCheck" },
    { label: "Заказ выполнен", date: order.completed_at, icon: "CheckCircle2" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="История заказа"
          aria-label="История заказа"
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        >
          <Icon name="History" size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <p className="font-head uppercase tracking-wide text-xs text-muted-foreground mb-3">
          История заказа
        </p>
        <div className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span
                className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${
                  s.date ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/50"
                }`}
              >
                <Icon name={s.icon} size={12} />
              </span>
              <div>
                <p className={`text-sm ${s.date ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.date ? formatDate(s.date) : "ещё не наступило"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GarageOrderHistory;
