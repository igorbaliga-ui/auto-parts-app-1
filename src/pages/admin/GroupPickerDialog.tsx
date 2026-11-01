import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { safeGetSession } from "@/lib/storage";

const URL_ = "https://functions.poehali.dev/daa66c4d-a3f5-4678-bfb6-c2a074c343d8";

type PartOptions = { part: string; options: { id: string; name: string }[] };

type Props = {
  leadId: number;
  disabled?: boolean;
  onApply: (overrides: Record<string, string>) => Promise<void>;
};

const GroupPickerDialog = ({ leadId, disabled, onApply }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [parts, setParts] = useState<PartOptions[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const headers = () => ({
    "Content-Type": "application/json",
    "X-Admin-Password": safeGetSession("admin_password") || "",
  });

  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    setChosen({});
    try {
      const res = await fetch(URL_, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ id: leadId, action: "group_options" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setParts(data.parts || []);
      if (data.error) setError(data.error);
    } catch {
      setParts([]);
      setError("Не удалось загрузить группы каталога.");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      await onApply(chosen);
      setOpen(false);
    } catch {
      setError("Не удалось подобрать. Попробуйте ещё раз.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={openDialog}>
        <Icon name="ListTree" size={14} className="mr-1.5" />
        Другая группа
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Группа каталога для запчасти</DialogTitle>
          </DialogHeader>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="Loader" size={14} className="animate-spin" />
              Загружаю группы...
            </div>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
          {!loading &&
            parts.map((p) => (
              <div key={p.part} className="flex flex-col gap-1">
                <span className="text-sm font-medium">{p.part}</span>
                <select
                  value={chosen[p.part] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setChosen((c) => {
                      const next = { ...c };
                      if (v) next[p.part] = v;
                      else delete next[p.part];
                      return next;
                    });
                  }}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">Как выбрано сейчас</option>
                  {p.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          {!loading && parts.length > 0 && (
            <Button onClick={apply} disabled={applying || Object.keys(chosen).length === 0}>
              <Icon name={applying ? "Loader" : "RefreshCw"} size={14} className={`mr-1.5 ${applying ? "animate-spin" : ""}`} />
              {applying ? "Подбираю..." : "Подобрать артикулы заново"}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GroupPickerDialog;
