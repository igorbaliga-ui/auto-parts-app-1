import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { safeGetSession } from "@/lib/storage";

const LEAD_AI_ARTICLES_URL =
  "https://functions.poehali.dev/daa66c4d-a3f5-4678-bfb6-c2a074c343d8";

type Result = {
  ai_articles: string;
  vin_decoded: string;
  source: string;
  via: string;
  catalog_note: string;
};

const FreeAiSearchButton = () => {
  const [open, setOpen] = useState(false);
  const [vin, setVin] = useState("");
  const [carName, setCarName] = useState("");
  const [parts, setParts] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const search = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(LEAD_AI_ARTICLES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": safeGetSession("admin_password") || "",
        },
        body: JSON.stringify({ action: "free_search", vin, car_name: carName, parts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error && e.message !== "error" ? e.message : "Не удалось подобрать. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.ai_articles);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sourceLabel = result
    ? result.via === "fapi"
      ? "Подобрано через FAPI — сверьте по VIN"
      : result.source === "catalog"
        ? "Из каталога TecDoc — сверьте с VIN"
        : "Предложено ИИ — проверьте"
    : "";

  return (
    <>
      <Button type="button" variant="outline" className="font-head uppercase tracking-wide" onClick={() => setOpen(true)}>
        <Icon name="Sparkles" size={16} className="mr-2" />
        <span className="hidden sm:inline">Подбор ИИ</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Подбор артикулов без заявки</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN (17 символов)" maxLength={32} />
            <Input value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="Авто, если нет VIN (например, Audi Q5 2012)" />
            <Textarea
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              placeholder="Запчасти, по одной в строке"
              rows={4}
            />
            <Button type="button" disabled={loading || !parts.trim() || (!vin.trim() && !carName.trim())} onClick={search}>
              <Icon name={loading ? "Loader" : "Sparkles"} size={14} className="mr-1.5" />
              {loading ? "Подбираю..." : "Подобрать артикулы"}
            </Button>
            {error && <span className="text-xs text-destructive">{error}</span>}
            {result && (
              <div className="flex flex-col gap-2">
                {result.catalog_note && (
                  <div className="text-xs rounded-sm bg-amber-500/10 text-amber-600 px-2 py-1.5">
                    Каталог не помог: {result.catalog_note}
                  </div>
                )}
                {result.vin_decoded && (
                  <div className="text-xs rounded-sm bg-muted/40 px-2 py-1.5">
                    <span className="block text-[11px] text-muted-foreground mb-0.5">Расшифровка VIN</span>
                    {result.vin_decoded}
                  </div>
                )}
                <span className={`text-[11px] ${result.source === "catalog" || result.via === "fapi" ? "text-emerald-500" : "text-amber-500"}`}>
                  {sourceLabel}
                </span>
                <pre className="text-sm whitespace-pre-wrap break-words font-sans rounded-sm border border-border p-3">
                  {result.ai_articles}
                </pre>
                <Button type="button" size="sm" variant="outline" onClick={copy} className="self-start">
                  <Icon name={copied ? "Check" : "Copy"} size={14} className="mr-1.5" />
                  {copied ? "Скопировано" : "Копировать"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FreeAiSearchButton;
