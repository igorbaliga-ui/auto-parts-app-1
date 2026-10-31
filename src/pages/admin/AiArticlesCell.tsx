import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import InlineEditableCell from "./InlineEditableCell";
import { safeGetSession } from "@/lib/storage";

const LEAD_AI_ARTICLES_URL =
  "https://functions.poehali.dev/daa66c4d-a3f5-4678-bfb6-c2a074c343d8";

type Props = {
  leadId: number;
  value: string | null;
  vinDecoded?: string | null;
  hasParts: boolean;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
};

const AiArticlesCell = ({ leadId, value, vinDecoded, hasParts, saveLeadField }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromCatalog, setFromCatalog] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(LEAD_AI_ARTICLES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": safeGetSession("admin_password") || "",
        },
        body: JSON.stringify({ id: leadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setFromCatalog(data.source === "catalog");
      await saveLeadField(leadId, "vin_decoded", data.vin_decoded || "");
      await saveLeadField(leadId, "ai_articles", data.ai_articles);
    } catch {
      setError("Не удалось подобрать. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 items-start text-left">
      {vinDecoded && (
        <div className="text-xs text-left w-full rounded-sm bg-muted/40 px-2 py-1.5">
          <span className="block text-[11px] text-muted-foreground mb-0.5">
            Расшифровка VIN
          </span>
          <span className="whitespace-pre-wrap break-words">{vinDecoded}</span>
        </div>
      )}
      {value && (
        <>
          <span className={`text-[11px] ${fromCatalog ? "text-emerald-500" : "text-amber-500"}`}>
            {fromCatalog ? "Из каталога TecDoc — сверьте с VIN" : "Предложено ИИ — проверьте"}
          </span>
          <InlineEditableCell
            value={value}
            displayLabel="Артикулы"
            multiline
            expandable
            onSave={(v) => saveLeadField(leadId, "ai_articles", v)}
            className="text-left whitespace-pre-wrap break-words line-clamp-6 max-w-full"
          />
        </>
      )}
      {hasParts && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={generate}
        >
          <Icon name={loading ? "Loader" : "Sparkles"} size={14} className="mr-1.5" />
          {loading ? "Подбираю..." : value ? "Подобрать заново" : "Подобрать артикулы"}
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
};

export default AiArticlesCell;
