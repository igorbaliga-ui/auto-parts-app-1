import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Icon from "@/components/ui/icon";
import InlineEditableCell from "./InlineEditableCell";
import ImageLightbox from "@/components/shared/ImageLightbox";
import { Lead, messengerLabel, statusLabel, formatDate } from "./adminTypes";

const MESSENGER_OPTIONS = [
  { value: "telegram", label: "Telegram" },
  { value: "max", label: "MAX" },
  { value: "whatsapp", label: "WhatsApp" },
];

type AdminLeadCardProps = {
  lead: Lead;
  draft: { amount: string; prepayment: string; note: string };
  savingId: number | null;
  setDraft: (id: number, value: string) => void;
  setPrepaymentDraft: (id: number, value: string) => void;
  setNoteDraft: (id: number, value: string) => void;
  saveLead: (id: number) => void;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
  toggleStatus: (id: number) => void;
  toggleArrived: (id: number) => void;
  toggleArchived: (id: number) => void;
  resetGaragePassword: (id: number) => void;
  toggleGarageBlock: (id: number) => void;
  saveClientNote: (id: number, note: string) => Promise<void>;
  onShowHistory: (id: number) => void;
  onShowLoginHistory: (phone: string, name: string) => void;
  onSendPush: (id: number) => void;
};

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0 pt-1.5">
      {label}
    </span>
    <div className="text-right min-w-0">{children}</div>
  </div>
);

const AdminLeadCard = ({
  lead: l,
  draft,
  savingId,
  setDraft,
  setPrepaymentDraft,
  setNoteDraft,
  saveLead,
  saveLeadField,
  toggleStatus,
  toggleArrived,
  toggleArchived,
  resetGaragePassword,
  toggleGarageBlock,
  saveClientNote,
  onShowHistory,
  onShowLoginHistory,
  onSendPush,
}: AdminLeadCardProps) => {
  return (
    <div className="bg-card border border-steel rounded-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-muted-foreground text-xs shrink-0">
            №{l.id}
          </span>
          <InlineEditableCell
            value={l.name}
            displayLabel="Имя"
            required
            onSave={(v) => saveLeadField(l.id, "name", v)}
            className="font-head tracking-[0.08em] text-base truncate"
          />
          <button
            title="История входов в «Гараж»"
            onClick={() => onShowLoginHistory(l.phone, l.name)}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
          >
            <Icon name="History" size={13} />
          </button>
        </div>
        <span className="text-muted-foreground text-xs shrink-0">
          {formatDate(l.created_at)}
        </span>
      </div>

      <Row label="VIN">
        <InlineEditableCell
          value={l.vin || ""}
          displayLabel="VIN"
          onSave={(v) => saveLeadField(l.id, "vin", v)}
          className="font-head tracking-[0.08em]"
        />
      </Row>
      <Row label="Авто">
        <InlineEditableCell
          value={l.car_name || ""}
          displayLabel="Авто"
          onSave={(v) => saveLeadField(l.id, "car_name", v)}
        />
      </Row>
      <Row label="Телефон">
        <div className="flex items-center gap-1.5 justify-end">
          <InlineEditableCell
            value={l.phone}
            displayLabel="Телефон"
            required
            onSave={(v) => saveLeadField(l.id, "phone", v)}
            renderValue={(v) => (
              <a
                href={`tel:${v}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary whitespace-nowrap"
              >
                {v}
              </a>
            )}
          />
          <span
            title={l.phone_verified ? 'Номер подтверждён звонком' : 'Номер не подтверждён звонком'}
            className="shrink-0 inline-flex"
          >
            <Icon
              name={l.phone_verified ? 'ShieldCheck' : 'ShieldQuestion'}
              size={13}
              className={l.phone_verified ? 'text-green-600' : 'text-muted-foreground'}
            />
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                title="Сбросить пароль от «Гаража»"
                disabled={savingId === l.id}
                className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <Icon name="KeyRound" size={13} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить пароль клиента?</AlertDialogTitle>
                <AlertDialogDescription>
                  Клиент {l.name} ({l.phone}) сможет войти в «Гараж» по одному
                  телефону, без пароля, и при желании задать новый.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetGaragePassword(l.id)}>
                  Сбросить пароль
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {l.garage_blocked ? (
            <button
              title="Разблокировать доступ в «Гараж»"
              disabled={savingId === l.id}
              onClick={() => toggleGarageBlock(l.id)}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-destructive hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="Lock" size={13} />
            </button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  title="Заблокировать доступ в «Гараж»"
                  disabled={savingId === l.id}
                  className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                >
                  <Icon name="LockOpen" size={13} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Заблокировать клиента в «Гараже»?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Клиент {l.name} ({l.phone}) временно не сможет войти в
                    личный кабинет «Гараж» по этому номеру телефона.
                    Разблокировать можно в любой момент.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toggleGarageBlock(l.id)}>
                    Заблокировать
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Row>
      <Row label="Город">
        <InlineEditableCell
          value={l.city || ""}
          displayLabel="Город"
          onSave={(v) => saveLeadField(l.id, "city", v)}
        />
      </Row>
      <Row label="Пробег">
        <InlineEditableCell
          value={l.mileage != null ? String(l.mileage) : ""}
          displayLabel="Пробег"
          onSave={(v) => saveLeadField(l.id, "mileage", v.replace(/\D/g, ""))}
          renderValue={(v) => (
            <span className="inline-flex items-center gap-1 text-primary font-medium tabular-nums">
              <Icon name="Gauge" size={12} />
              {Number(v).toLocaleString("ru-RU")} км
            </span>
          )}
        />
      </Row>
      <Row label="Мессенджер">
        <InlineEditableCell
          value={l.messenger || ""}
          displayLabel="Мессенджер"
          options={MESSENGER_OPTIONS}
          onSave={(v) => saveLeadField(l.id, "messenger", v)}
          renderValue={(v) => messengerLabel[v] ?? v}
        />
      </Row>
      <Row label="Запчасти">
        <InlineEditableCell
          value={l.parts || ""}
          displayLabel="Запчасти"
          multiline
          onSave={(v) => saveLeadField(l.id, "parts", v)}
          className="text-left whitespace-pre-wrap break-words line-clamp-5 max-w-full"
        />
      </Row>
      {l.photo_urls && l.photo_urls.length > 0 && (
        <Row label="Фото">
          <ImageLightbox
            urls={l.photo_urls}
            className="flex items-center gap-1.5 ml-auto"
            imgClassName="h-12 w-12 object-cover rounded-sm border border-steel"
          />
        </Row>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Сумма заказа
          </label>
          <Input
            type="number"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => setDraft(l.id, e.target.value)}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div>
          <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
            Предоплата
          </label>
          <Input
            type="number"
            inputMode="decimal"
            value={draft.prepayment}
            onChange={(e) => setPrepaymentDraft(l.id, e.target.value)}
            placeholder="0"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-2 text-sm">
        <span className="text-muted-foreground">
          Остаток:{" "}
          <span className="text-foreground">
            {l.remaining != null ? `${l.remaining} ₽` : "—"}
          </span>
        </span>
        <span className="text-muted-foreground">
          Бонусы:{" "}
          <span className="text-primary">
            {l.cashback != null ? `${l.cashback} бонусов` : "—"}
          </span>
        </span>
      </div>

      <div>
        <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1 mt-2">
          Заметка (видна только менеджерам)
        </label>
        <Textarea
          value={draft.note}
          onChange={(e) => setNoteDraft(l.id, e.target.value)}
          placeholder="Заметка для менеджеров"
          className="min-h-16 text-sm"
        />
      </div>

      <div>
        <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1 mt-2"></label>
        <InlineEditableCell
          value={l.phone_note || ""}
          displayLabel="Заметка по клиенту"
          multiline
          onSave={(v) => saveClientNote(l.id, v)}
          className="text-left whitespace-pre-wrap text-amber-500/90 block w-full"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <button
          onClick={() => toggleStatus(l.id)}
          disabled={savingId === l.id}
          className={`relative whitespace-nowrap text-[0.65rem] font-head uppercase tracking-wide px-2 py-1.5 rounded-sm transition-colors ${
            l.status === "done"
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : l.status === "new"
                ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {l.status === "new" && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
          )}
          {statusLabel[l.status]}
        </button>
        {l.status === "in_progress" && (
          <button
            onClick={() => toggleArrived(l.id)}
            disabled={savingId === l.id}
            className={`shrink-0 flex items-center gap-1 whitespace-nowrap text-[0.65rem] font-head uppercase tracking-wide px-2 py-1.5 rounded-sm transition-colors ${
              l.arrived
                ? "bg-green-600/15 text-green-500 hover:bg-green-600/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon name="Check" size={11} />
            Поступило
          </button>
        )}
        <button
          onClick={() => toggleArchived(l.id)}
          disabled={savingId === l.id}
          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-sm transition-colors ${
            l.archived
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : "text-muted-foreground hover:text-primary hover:bg-muted"
          }`}
        >
          <Icon name={l.archived ? "ArchiveRestore" : "Archive"} size={13} />
        </button>
        {l.completed_at && (
          <span className="text-primary/80 text-xs ml-auto">
            Выполнен {formatDate(l.completed_at)}
          </span>
        )}
      </div>
      {l.handled_by && (
        <div className="text-muted-foreground text-xs mt-1.5">
          Менеджер: <span className="text-foreground">{l.handled_by}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-3">
        <Button
          size="sm"
          onClick={() => saveLead(l.id)}
          disabled={savingId === l.id}
          className="font-head uppercase tracking-wide text-xs h-9 flex-1"
        >
          {savingId === l.id ? "…" : "Сохранить"}
        </Button>
        <button
          onClick={() => onSendPush(l.id)}
          title="Отправить push-уведомление клиенту"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors border border-steel"
        >
          <Icon name="Send" size={15} />
        </button>
        <button
          onClick={() => onShowHistory(l.id)}
          title="История изменений"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors border border-steel"
        >
          <Icon name="History" size={15} />
        </button>
      </div>
    </div>
  );
};

export default AdminLeadCard;