import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { safeGetSession } from "@/lib/storage";
import CatalogModeSwitch from "./CatalogModeSwitch";

const URL_ = "https://functions.poehali.dev/daa66c4d-a3f5-4678-bfb6-c2a074c343d8";

type Result = {
  key: "ok" | "rejected" | "missing" | "unavailable";
  code?: number;
  status?: string;
  status_text?: string;
  plan?: string;
  credits_left?: number | null;
  credits_total?: number | null;
  balance_rub?: number | null;
  vin_access?: string;
  vin_balance_rub?: number | null;
};

const Row = ({ ok, text }: { ok: boolean; text: string }) => (
  <div className="flex items-start gap-1.5">
    <Icon name={ok ? "CircleCheck" : "CircleAlert"} size={14} className={`mt-0.5 shrink-0 ${ok ? "text-green-600" : "text-destructive"}`} />
    <span>{text}</span>
  </div>
);

const KEY_LABELS: Record<string, string> = {
  PARTSAPI_KEY: "Основной ключ",
  PARTSAPI_KEY_VIN: "Ключ для номеров по VIN",
  PARTSAPI_KEY_TREE: "Ключ для дерева групп",
  PARTSAPI_KEY_ARTICLES: "Ключ для артикулов",
};

type PaResult = Record<string, string | Record<string, string>>;

const FapiCheckButton = () => {
  const [pa, setPa] = useState<PaResult | null>(null);
  const [paLoading, setPaLoading] = useState(false);

  const checkPa = async () => {
    setPaLoading(true);
    try {
      const res = await fetch(URL_, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": safeGetSession("admin_password") || "" },
        body: JSON.stringify({ action: "partsapi_check" }),
      });
      if (!res.ok) throw new Error();
      setPa(await res.json());
    } catch {
      setPa({ error: "Не удалось проверить" });
    } finally {
      setPaLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [r, setR] = useState<Result | null>(null);

  const check = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(URL_, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": safeGetSession("admin_password") || "" },
        body: JSON.stringify({ action: "fapi_check" }),
      });
      if (!res.ok) throw new Error();
      setR(await res.json());
    } catch {
      setR(null);
      setError("Не удалось проверить. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const keyOk = r?.key === "ok";
  const vinOk = r?.vin_access === "ok";

  return (
    <div className="relative flex gap-2">
      <CatalogModeSwitch />
      <Button variant="secondary" onClick={checkPa} disabled={paLoading} className="font-head uppercase tracking-wide">
        <Icon name={paLoading ? "Loader" : "KeyRound"} size={16} className={`mr-2 ${paLoading ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Ключи PartsAPI</span>
      </Button>
      <Button variant="secondary" onClick={check} disabled={loading} className="font-head uppercase tracking-wide">
        <Icon name={loading ? "Loader" : "KeyRound"} size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Ключ FAPI</span>
      </Button>
      {pa && (
        <div className="absolute right-0 top-full mt-2 z-50 w-96 max-w-[90vw] rounded-md border bg-background p-3 text-sm shadow-lg flex flex-col gap-2">
          <button onClick={() => setPa(null)} className="absolute right-2 top-2 text-muted-foreground">
            <Icon name="X" size={14} />
          </button>
          {Object.entries(pa).map(([name, v]) =>
            typeof v === "string" ? (
              <Row key={name} ok={false} text={`${KEY_LABELS[name] || name}: ${v}`} />
            ) : (
              <div key={name} className="flex flex-col gap-0.5">
                <span className="font-medium">{KEY_LABELS[name] || name}</span>
                {Object.entries(v).map(([m, st]) => (
                  <Row key={m} ok={st === "принят"} text={`${m}: ${st}`} />
                ))}
              </div>
            )
          )}
        </div>
      )}
      {(r || error) && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-md border bg-background p-3 text-sm shadow-lg flex flex-col gap-1.5">
          <button onClick={() => { setR(null); setError(""); }} className="absolute right-2 top-2 text-muted-foreground">
            <Icon name="X" size={14} />
          </button>
          {error && <span className="text-destructive">{error}</span>}
          {r?.key === "missing" && <Row ok={false} text="Ключ FAPI не задан" />}
          {r?.key === "unavailable" && <Row ok={false} text="FAPI сейчас не отвечает" />}
          {r?.key === "rejected" && <Row ok={false} text="Ключ не принят FAPI" />}
          {keyOk && r && (
            <>
              <Row ok text="Ключ принят" />
              <Row ok={vinOk} text={vinOk ? "Доступ к расшифровке VIN открыт" : r.vin_access === "no_access" ? "Нет доступа к расшифровке VIN" : "Расшифровка VIN сейчас недоступна"} />
              {vinOk && r.vin_balance_rub != null && <Row ok={r.vin_balance_rub > 0} text={`Баланс на VIN: ${r.vin_balance_rub} ₽`} />}
              {r.credits_total != null && <Row ok={(r.credits_left ?? 0) > 0} text={`Кредитов осталось: ${r.credits_left ?? 0} из ${r.credits_total}`} />}
              {r.balance_rub != null && <Row ok text={`Баланс: ${r.balance_rub} ₽`} />}
              {r.status !== "allowed" && r.status !== "unbilled" && r.status_text && <Row ok={false} text={r.status_text} />}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FapiCheckButton;
