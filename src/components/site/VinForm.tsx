import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useSubmitLead } from "@/hooks/use-submit-lead";
import { preparePhotoForUpload } from "@/lib/image";
import {
  GARAGE_PHONE_KEY,
  notifyGarageAuthChanged,
} from "@/hooks/use-garage-auth";
import { normalizePhoneInput } from "@/lib/phone";

const messengers = [
  { id: "telegram", label: "Telegram", icon: "Send" },
  { id: "max", label: "MAX", icon: "MessageSquare" },
  { id: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
] as const;

const VinForm = () => {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ vin: "", name: "", phone: "", parts: "" });
  const [messenger, setMessenger] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const setPhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({
      ...f,
      phone: normalizePhoneInput(f.phone, e.target.value),
    }));

  const validate = () => {
    const e: Record<string, string> = {};
    const vin = form.vin.trim();
    const vinValid = vin.length >= 11 && vin.length <= 17;
    if (!vinValid && !photo) e.vin = "Укажите VIN или прикрепите фото СТС";
    if (form.name.trim().length < 2) e.name = "Укажите имя";
    if (form.phone.replace(/\D/g, "").length < 10)
      e.phone = "Укажите корректный телефон";
    if (!messenger) e.messenger = "Выберите мессенджер";
    if (form.parts.trim().length < 2) e.parts = "Укажите интересующие запчасти";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const { submitLead, submitting } = useSubmitLead(() => {
    setSent(true);
    if (form.phone) {
      localStorage.setItem(GARAGE_PHONE_KEY, form.phone);
      notifyGarageAuthChanged();
      navigate("/garage");
    }
    setForm({ vin: "", name: "", phone: "", parts: "" });
    setMessenger(null);
    removePhoto();
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const photoBase64 = photo ? await preparePhotoForUpload(photo) : null;
    submitLead({ ...form, messenger, photo: photoBase64 });
  };

  return (
    <section
      id="vin"
      className="relative bg-card border-y border-border py-20 sm:py-28"
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-5">
            <i className="w-11 h-0.5 bg-primary inline-block" />
            Форма подбора
          </span>
          <h2 className="font-head font-bold uppercase leading-[0.95] tracking-[-0.02em] text-4xl sm:text-5xl mb-5">
            Оставьте VIN —<br />
            <span className="text-primary">найдём деталь</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-[42ch] mb-8">
            Заполните форму: мы определим модель по VIN, подберём оригинал или
            качественный аналог и вышлем цену со сроком поставки.
          </p>
          <ul className="flex flex-col gap-4">
            {[
              { icon: "ScanLine", t: "Точный подбор по 17 символам VIN" },
              { icon: "Users", t: "Опт для сервисов, розница для водителей" },
              { icon: "Clock", t: "Ответ и расчёт в течение 15 минут" },
            ].map((i) => (
              <li
                key={i.t}
                className="flex items-center gap-3 text-foreground/90"
              >
                <span className="w-9 h-9 shrink-0 rounded-sm bg-primary/15 flex items-center justify-center">
                  <Icon name={i.icon} className="text-primary" size={18} />
                </span>
                {i.t}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-background border border-steel rounded-sm p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                <Icon name="Check" className="text-primary" size={34} />
              </div>
              <h3 className="font-head uppercase tracking-wide text-2xl">
                Заявка отправлена
              </h3>
              <p className="text-muted-foreground max-w-[32ch]">
                Спасибо! Подберём деталь по VIN и перезвоним в течение 15 минут.
              </p>
              <Button
                variant="secondary"
                className="mt-2 font-head uppercase tracking-wide"
                onClick={() => setSent(false)}
              >
                Отправить ещё одну
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    VIN-код{" "}
                    {photo && (
                      <span className="normal-case text-muted-foreground/70">
                        (необязательно, есть фото)
                      </span>
                    )}
                  </label>
                  {photoPreview ? (
                    <div className="relative shrink-0">
                      <img
                        src={photoPreview}
                        alt="Фото СТС"
                        className="h-9 w-9 object-cover rounded-full border-2 border-primary"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        aria-label="Удалить фото"
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Icon
                          name="X"
                          size={10}
                          className="text-primary-foreground"
                        />
                      </button>
                    </div>
                  ) : (
                    <label
                      aria-label="Прикрепить фото СТС"
                      title="Прикрепить фото СТС"
                      className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground cursor-pointer hover:brightness-110 transition-all shadow-sm"
                    >
                      <Icon name="Camera" size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <Input
                  value={form.vin}
                  onChange={set("vin")}
                  maxLength={17}
                  placeholder="XW8ZZZ• • • • • • •"
                  className="mt-1.5 uppercase tracking-[0.14em] h-12"
                />
                {errors.vin && (
                  <p className="text-primary text-xs mt-1">{errors.vin}</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    Имя
                  </label>
                  <Input
                    value={form.name}
                    onChange={set("name")}
                    maxLength={30}
                    placeholder="Ваше имя"
                    className="mt-1.5 h-12"
                  />
                  {errors.name && (
                    <p className="text-primary text-xs mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    Телефон
                  </label>
                  <Input
                    value={form.phone}
                    onChange={setPhone}
                    maxLength={12}
                    placeholder="+7 900 000-00-00"
                    className="mt-1.5 h-12"
                  />
                  {errors.phone && (
                    <p className="text-primary text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  Удобный мессенджер
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {messengers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setMessenger((cur) => (cur === m.id ? null : m.id))
                      }
                      className={`relative flex items-center justify-center gap-2 h-11 rounded-sm border text-sm transition-colors ${
                        messenger === m.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-steel text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      <Icon name={m.icon} size={16} />
                      {m.label}
                      {messenger === m.id && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Icon
                            name="Check"
                            size={12}
                            className="text-primary-foreground"
                          />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {errors.messenger && (
                  <p className="text-primary text-xs mt-1">
                    {errors.messenger}
                  </p>
                )}
              </div>
              <div>
                <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  Интересующие запчасти
                </label>
                <Textarea
                  value={form.parts}
                  onChange={set("parts")}
                  onFocus={(e) => {
                    const target = e.currentTarget;
                    setTimeout(() => {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }, 300);
                  }}
                  maxLength={1000}
                  placeholder="Например: передние тормозные колодки, масляный фильтр"
                  className="mt-1.5 min-h-[90px]"
                />
                <p className="text-muted-foreground text-xs mt-1 text-right">
                  {form.parts.length}/1000
                </p>
                {errors.parts && (
                  <p className="text-primary text-xs mt-1">{errors.parts}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="font-head uppercase tracking-wide font-bold h-12 mt-1"
              >
                {submitting ? "Отправляем…" : "Подобрать запчасти"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Нажимая кнопку, вы соглашаетесь на обработку данных.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default VinForm;
