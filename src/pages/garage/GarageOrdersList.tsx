import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ExpandableText from "@/components/shared/ExpandableText";
import { isPushSupported } from "@/hooks/use-push-subscription";
import GarageOrderHistory from "./GarageOrderHistory";
import { Order, messengerLabel, formatDate, formatMoney, formatBonus } from "./garageTypes";
import { sanitizeCarNameInput, sanitizeMileageInput } from "@/lib/text";

type GarageOrdersListProps = {
  orders: Order[];
  totalCashback: number;
  onShowCashbackHistory: () => void;
  onShowReferral: () => void;
  pushPermission: NotificationPermission | "unsupported";
  pushSubscribing: boolean;
  pushSubscribed: boolean;
  subscribePush: () => void;
  onNewRequest: () => void;
  onOpenArchive: () => void;
  statusTab: "new" | "in_progress" | "done";
  setStatusTab: (tab: "new" | "in_progress" | "done") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  newOrders: Order[];
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
  mileageDrafts: Record<number, string>;
  setMileageDrafts: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
  savedMileages: Record<number, string>;
  savingMileageId: number | null;
  mileageErrors: Record<number, string>;
  saveMileage: (order: Order) => void;
};

const GarageOrdersList = ({
  orders,
  totalCashback,
  onShowCashbackHistory,
  onShowReferral,
  pushPermission,
  pushSubscribing,
  pushSubscribed,
  subscribePush,
  onNewRequest,
  onOpenArchive,
  statusTab,
  setStatusTab,
  searchQuery,
  setSearchQuery,
  newOrders,
  inProgressOrders,
  doneOrders,
  visibleOrders,
  carNameDrafts,
  setCarNameDrafts,
  savedCarNames,
  savingCarId,
  saveCarName,
  mileageDrafts,
  setMileageDrafts,
  savedMileages,
  savingMileageId,
  mileageErrors,
  saveMileage,
}: GarageOrdersListProps) => {
  const [searchOpen, setSearchOpen] = useState(() => !!searchQuery);
  const [mileageInfoOpen, setMileageInfoOpen] = useState(false);
  return (
    <>
      {orders.length > 0 && (
        <div className="mb-5 mt-4 bg-card border border-primary/40 rounded-sm px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-head text-xl text-primary">
              {formatBonus(totalCashback)}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onShowReferral}
              title="Пригласить друга"
              className="flex items-center justify-center w-8 h-8 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="Gift" size={15} />
            </button>
            <button
              onClick={onShowCashbackHistory}
              title="История начислений и списаний"
              className="flex items-center justify-center w-8 h-8 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="History" size={15} />
            </button>
          </div>
        </div>
      )}

      {isPushSupported() && pushPermission !== "granted" && !pushSubscribed && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-primary/15 via-card to-card border border-primary/60 rounded-sm p-4 animate-glow-pulse">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="Bell" className="text-primary animate-bell-ring" size={18} />
            </span>
            <p className="text-sm text-foreground">
              Включите уведомления — сообщим, когда деталь поступит.
            </p>
          </div>
          <Button
            size="sm"
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
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {searchOpen && (
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) setSearchOpen(false);
                  }}
                  placeholder="VIN или название авто"
                  className="h-8 sm:h-10 w-40 sm:w-56 bg-transparent border-0 border-b border-steel rounded-none text-[0.7rem] sm:text-sm focus-visible:ring-0 focus-visible:border-primary px-1"
                />
              )}
              <button
                onClick={() => {
                  if (searchOpen && searchQuery) {
                    setSearchQuery("");
                    setSearchOpen(false);
                  } else {
                    setSearchOpen((v) => !v);
                  }
                }}
                aria-label={searchOpen ? "Закрыть поиск" : "Поиск по VIN или названию авто"}
                className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Icon name={searchOpen && searchQuery ? "X" : "Search"} size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => setStatusTab("new")}
                className={`shrink-0 h-8 sm:h-10 px-2 sm:px-4 rounded-sm border text-[0.7rem] sm:text-sm font-head uppercase tracking-wide transition-colors flex items-center gap-1 sm:gap-1.5 ${
                  statusTab === "new"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-steel text-muted-foreground hover:border-primary/60"
                }`}
              >
                {newOrders.length > 0 && (
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500" />
                  </span>
                )}
                Новые ({newOrders.length})
              </button>
              <button
                onClick={() => setStatusTab("in_progress")}
                className={`shrink-0 h-8 sm:h-10 px-2 sm:px-4 rounded-sm border text-[0.7rem] sm:text-sm font-head uppercase tracking-wide transition-colors ${
                  statusTab === "in_progress"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-steel text-muted-foreground hover:border-primary/60"
                }`}
              >
                В работе ({inProgressOrders.length})
              </button>
              <button
                onClick={() => setStatusTab("done")}
                className={`shrink-0 h-8 sm:h-10 px-2 sm:px-4 rounded-sm border text-[0.7rem] sm:text-sm font-head uppercase tracking-wide transition-colors ${
                  statusTab === "done"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-steel text-muted-foreground hover:border-primary/60"
                }`}
              >
                Выполненные ({doneOrders.length})
              </button>
            </div>
            <button
              onClick={onOpenArchive}
              title="Архив заявок"
              aria-label="Архив заявок"
              className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="Archive" size={16} />
            </button>
          </div>

          {visibleOrders.length === 0 ? (
            <p className="text-muted-foreground mt-4">
              {searchQuery
                ? "Ничего не найдено по вашему запросу."
                : statusTab === "new"
                ? "Нет новых заявок."
                : statusTab === "in_progress"
                ? "Нет заказов в работе."
                : "Нет выполненных заказов."}
            </p>
          ) : (
            <div className="flex flex-col gap-4 mt-2">
              {visibleOrders.map((o, i) => (
                <div
                  key={o.id}
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                  className="relative bg-card border border-steel rounded-sm p-6 animate-fade-in opacity-0"
                >
                  <span className="absolute top-1.5 left-2 text-[0.6rem] text-muted-foreground/30 select-none">
                    №{o.id}
                  </span>
                  {o.status !== "done" && o.arrived && (
                    <span
                      title="Деталь поступила"
                      className="absolute -top-2.5 -right-2.5 flex items-center gap-1 bg-green-600 text-white text-[0.65rem] font-head uppercase tracking-wide px-2 py-1 rounded-full shadow-sm"
                    >
                      <Icon name="Check" size={12} />
                      Поступило
                    </span>
                  )}
                  <span
                    className={`absolute right-3 text-[0.65rem] font-head uppercase tracking-wide px-2 py-1 rounded-sm ${
                      o.status !== "done" && o.arrived ? "top-8" : "top-3"
                    } ${
                      o.status === "done"
                        ? "bg-primary/15 text-primary"
                        : o.status === "new"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {o.status === "done" ? "Выполнен" : o.status === "new" ? "Новая" : "В работе"}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pr-20">
                    <span className="font-head tracking-[0.1em] text-lg">
                      {o.vin || "VIN не указан (по фото)"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs">
                        {formatDate(o.created_at)}
                      </span>
                      <GarageOrderHistory order={o} />
                    </div>
                  </div>
                  {o.vin && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Input
                        value={carNameDrafts[o.id] ?? ""}
                        onChange={(e) => {
                          const value = sanitizeCarNameInput(e.target.value);
                          setCarNameDrafts((d) => ({ ...d, [o.id]: value }));
                        }}
                        maxLength={25}
                        inputMode="text"
                        autoCapitalize="words"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
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
                          {savingCarId === o.id ? (
                            <Icon name="Loader2" size={14} className="animate-spin" />
                          ) : (
                            "Сохранить"
                          )}
                        </Button>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto pl-3 border-l border-steel/60">
                        <button
                          type="button"
                          onClick={() => setMileageInfoOpen(true)}
                          aria-label="Зачем указывать пробег"
                          title="Зачем указывать пробег"
                          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 hover:bg-primary/25 transition-colors"
                        >
                          <Icon name="Gauge" size={14} className="text-primary" />
                        </button>
                        <div className="relative">
                          <Input
                            value={mileageDrafts[o.id] ?? ""}
                            onChange={(e) => {
                              const value = sanitizeMileageInput(e.target.value);
                              setMileageDrafts((d) => ({ ...d, [o.id]: value }));
                            }}
                            maxLength={7}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Пробег"
                            aria-label="Пробег автомобиля, км"
                            className="h-9 text-sm bg-background w-28 pr-9 tabular-nums"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] text-muted-foreground uppercase tracking-wide">
                            км
                          </span>
                        </div>
                        {(mileageDrafts[o.id] ?? "").trim() !==
                          (savedMileages[o.id] ?? "").trim() && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={savingMileageId === o.id}
                            onClick={() => saveMileage(o)}
                            className="h-9 font-head uppercase tracking-wide text-xs"
                          >
                            {savingMileageId === o.id ? (
                              <Icon name="Loader2" size={14} className="animate-spin" />
                            ) : (
                              "Сохранить"
                            )}
                          </Button>
                        )}
                      </div>
                      {mileageErrors[o.id] && (
                        <p className="w-full text-primary text-xs">
                          {mileageErrors[o.id]}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
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
                    <div className="sm:col-span-2 bg-muted/40 border border-steel rounded-sm px-3 py-2">
                      <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wide">
                        Запчасти
                      </span>
                      <ExpandableText
                        text={o.parts}
                        label="Интересующие запчасти"
                        className="text-left"
                      />
                    </div>
                    {o.order_amount != null && o.order_amount !== 0 && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">
                          Сумма заказа:{" "}
                        </span>
                        <span>{formatMoney(o.order_amount)}</span>
                      </div>
                    )}
                    {o.status === "in_progress" && o.prepayment != null && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">
                          Предоплата:{" "}
                        </span>
                        <span>{formatMoney(o.prepayment)}</span>
                      </div>
                    )}
                    {o.status === "in_progress" && o.remaining != null && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">
                          Остаток:{" "}
                        </span>
                        <span>{formatMoney(o.remaining)}</span>
                      </div>
                    )}
                    {o.status === "in_progress" && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">
                          Бонусы начислим:{" "}
                        </span>
                        <span className="text-primary">
                          {o.pending_cashback != null
                            ? formatBonus(o.pending_cashback)
                            : "—"}
                        </span>
                      </div>
                    )}
                    {o.status === "done" && (
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">Бонусы: </span>
                        <span className="text-primary">
                          {o.cashback != null ? formatBonus(o.cashback) : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <Dialog open={mileageInfoOpen} onOpenChange={setMileageInfoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Gauge" size={18} className="text-primary" />
              Пробег автомобиля
            </DialogTitle>
            <DialogDescription>
              Укажите пробег автомобиля, чтобы отслеживать историю ремонта.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GarageOrdersList;