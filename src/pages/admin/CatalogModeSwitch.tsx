import { useEffect, useState } from "react";
import { safeGetSession } from "@/lib/storage";
import funcs from "../../../backend/func2url.json";

const URL_ = (funcs as Record<string, string>)["lead-ai-articles"];

const MODES: { key: string; label: string; hint: string }[] = [
  { key: "auto", label: "Авто", hint: "Сначала FAPI, если не помог — PartsAPI" },
  { key: "fapi", label: "FAPI", hint: "Только FAPI" },
  { key: "partsapi", label: "PartsAPI", hint: "Только PartsAPI" },
];

const CatalogModeSwitch = () => {
  const [mode, setMode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const call = async (action: string, m?: string) => {
    const res = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Password": safeGetSession("admin_password") || "" },
      body: JSON.stringify({ action, mode: m }),
    });
    if (!res.ok) throw new Error();
    return (await res.json()).mode as string;
  };

  useEffect(() => {
    call("catalog_mode_get").then(setMode).catch(() => setError("Не удалось загрузить"));
  }, []);

  const choose = async (m: string) => {
    if (m === mode || saving) return;
    setSaving(true);
    setError("");
    try {
      setMode(await call("catalog_mode_set", m));
    } catch {
      setError("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2" title={error || "Какой каталог использовать для подбора артикулов"}>
      <span className="hidden lg:inline text-xs uppercase tracking-wide text-muted-foreground">Каталог</span>
      <div className="flex rounded-sm border border-steel overflow-hidden">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            title={m.hint}
            disabled={mode === null || saving}
            onClick={() => choose(m.key)}
            className={`h-10 px-3 text-sm font-head uppercase tracking-wide transition-colors ${
              mode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
};

export default CatalogModeSwitch;
