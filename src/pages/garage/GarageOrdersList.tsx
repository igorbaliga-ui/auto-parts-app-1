import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import ExpandableText from "@/components/shared/ExpandableText";
import { isPushSupported } from "@/hooks/use-push-subscription";
import { Order, messengerLabel, formatDate, formatMoney } from "./garageTypes";

type GarageOrdersListProps = {
  orders: Order[];
  totalCashback: number;
  pushPermission: NotificationPermission | "unsupported";
  pushSubscribing: boolean;
  subscribePush: () => void;
  onNewRequest: () => void;
  statusTab: "in_progress" | "done";
  setStatusTab: (tab: "in_progress" | "done") => void;
  inProgressOrders: Order[];
  doneOrders: Order[];
  visibleOrders: Order[];
  carNameDrafts: Record<number, string>;
  setCarNameDrafts: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
  savedCarNames: Record<number, string>;
  savingCarId: number | null;
  saveCarName: (order: Order) => void;
};

const GarageOrdersList = ({
  orders,
  totalCashback,
  pushPermission,
  pushSubscribing,
  subscribePush,
  onNewRequest,
  statusTab,
  setStatusTab,
  inProgressOrders,
  doneOrders,
  visibleOrders,
  carNameDrafts,
  setCarNameDrafts,
  savedCarNames,
  savingCarId,
  saveCarName,
}: GarageOrdersListProps) => {
  return (
    <>
      {orders.length > 0 && (
        <div className="mb-8 mt-6">
          <div className="bg-card border border-primary/40 rounded-sm p-6">
            <span className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Накопленный кэшбэк
            </span>
            <div className="font-head text-3xl mt-1 text-primary">
              {formatMoney(totalCashback)}
            </div>
          </div>
        </div>
      )}

      {isPushSupported() && pushPermission !== "granted" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-card border border-steel rounded-sm p-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
              <Icon name="Bell" className="text-primary" size={18} />
            </span>
            <p className="text-sm text-muted-foreground">
              Включите уведомления — сообщим, когда деталь поступит.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={pushSubscribing}
            onClick={subscribePush}
            className="font-head uppercase tracking-wide text-xs shrink-0"
          >
            {pushSubscribing ? "Включаем…" : "Включить"}
          </Button>
        </div>
      )}
      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-start gap-4">
          <p className="text-muted-foreground">
            По этому телефону заказов пока нет.
          </p>
          <Button
            onClick={onNewRequest}
            className="font-head uppercase tracking-wide"
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Оставить заявку
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setStatusTab("in_progress")}
              className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
                statusTab === "in_progress"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-steel text-muted-foreground hover:border-primary/60"
              }`}
            >
              В работе ({inProgressOrders.length})
            </button>
            <button
              onClick={() => setStatusTab("done")}
              className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
                statusTab === "done"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-steel text-muted-foreground hover:border-primary/60"
              }`}
            >
              Выполненные ({doneOrders.length})
            </button>
          </div>

          {visibleOrders.length === 0 ? (
            <p className="text-muted-foreground mt-4">
              {statusTab === "in_progress"
                ? "Нет заказов в работе."
                : "Нет выполненных заказов."}
            </p>
          ) : (
            <div className="flex flex-col gap-4 mt-2">
              {visibleOrders.map((o) => (
                <div
                  key={o.id}
                  className="relative bg-card border border-steel rounded-sm p-6"
                >
                  {o.status !== "done" && o.arrived && (
                    <span
                      title="Деталь поступила"
                      className="absolute -top-2.5 -right-2.5 flex items-center gap-1 bg-green-600 text-white text-[0.65rem] font-head uppercase tracking-wide px-2 py-1 rounded-full shadow-sm"
                    >
                      <Icon name="Check" size={12} />
                      Поступило
                    </span>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="font-head tracking-[0.1em] text-lg">
                      {o.vin || "VIN не указан (по фото)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[0.65rem] font-head uppercase tracking-wide px-2 py-1 rounded-sm ${
                          o.status === "done"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {o.status === "done" ? "Выполнен" : "В работе"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(o.created_at)}
                      </span>
                    </div>
                  </div>
                  {o.status === "done" && o.completed_at && (
                    <p className="text-primary/80 text-xs mb-3 -mt-2">
                      Выполнен: {formatDate(o.completed_at)}
                    </p>
                  )}
                  {o.vin && (
                    <div className="flex items-center gap-2 mb-4">
                      <Input
                        value={carNameDrafts[o.id] ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCarNameDrafts((d) => ({ ...d, [o.id]: value }));
                        }}
                        maxLength={25}
                        placeholder="Название автомобиля"
                        className="h-9 text-sm bg-background max-w-xs"
                      />
                      {(carNameDrafts[o.id] ?? "").trim() !==
                        (savedCarNames[o.id] ?? "").trim() && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingCarId === o.id}
                          onClick={() => saveCarName(o)}
                          className="h-9 font-head uppercase tracking-wide text-xs"
                        >
                          {savingCarId === o.id ? "…" : "Сохранить"}
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">Имя: </span>
                      <span>{o.name}</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">Телефон: </span>
                      <span>{o.phone}</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">Город: </span>
                      <span>{o.city || "—"}</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">
                        Мессенджер:{" "}
                      </span>
                      <span>
                        {o.messenger
                          ? (messengerLabel[o.messenger] ?? o.messenger)
                          : "—"}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block mb-1">
                        Запчасти:
                      </span>
                      <ExpandableText
                        text={o.parts}
                        label="Интересующие запчасти"
                        className="text-left"
                      />
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">
                        Сумма заказа:{" "}
                      </span>
                      <span>
                        {o.order_amount != null
                          ? formatMoney(o.order_amount)
                          : "Уточняется"}
                      </span>
                    </div>
                    {o.status !== "done" && o.prepayment != null && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">
                          Предоплата:{" "}
                        </span>
                        <span>{formatMoney(o.prepayment)}</span>
                      </div>
                    )}
                    {o.status !== "done" && o.remaining != null && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">Остаток: </span>
                        <span>{formatMoney(o.remaining)}</span>
                      </div>
                    )}
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">Кэшбэк: </span>
                      <span className="text-primary">
                        {o.cashback != null ? formatMoney(o.cashback) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default GarageOrdersList;
