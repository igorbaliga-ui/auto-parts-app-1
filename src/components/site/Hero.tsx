import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useRequest } from "./RequestDialog";
import { useGarageAuth } from "@/hooks/use-garage-auth";
import { sanitizeVinInput } from "@/lib/vin";
import PhotoAttach from "@/components/site/PhotoAttach";
import { usePhotoAttach } from "@/hooks/use-photo-attach";
import { setLastVin } from "@/hooks/use-last-vin";

// VIN без дефисов, максимум 17 символов (полный VIN — 17, короткие форматы — 10)
const sanitizeHeroVin = (raw: string) =>
  sanitizeVinInput(raw).replace(/-/g, "").slice(0, 17);

const Hero = () => {
  const { open } = useRequest();
  const { authed: garageAuthed } = useGarageAuth();
  const [vin, setVin] = useState("");
  const { photos, photoPreviews, addPhotos, removePhoto } = usePhotoAttach();

  const handleAddPhotos = (files: File[]) => {
    addPhotos(files);
    setLastVin(vin);
    open(vin, files);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLastVin(vin);
    open(vin);
  };

  return (
    <section id="top" className="relative min-h-screen overflow-hidden">
      <div className="relative z-20 max-w-[1400px] mx-auto min-h-screen flex items-center px-5 sm:px-8 lg:px-12 pt-28 pb-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-10 w-full">
          {/* copy */}
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-6">
              <i className="w-11 h-0.5 bg-primary inline-block" />
              Подбор по VIN
            </span>

            <h1 className="font-head font-bold uppercase leading-[0.92] tracking-[-0.03em] text-[12vw] xs:text-[11vw] sm:text-6xl lg:text-[5.1rem] mb-6 break-words">
              Введи&nbsp;VIN&nbsp;—
              <br />
              <span className="text-primary">получи</span>{" "}
              <span className="font-medium text-muted-foreground">нужную</span>
              <br />
              деталь
            </h1>

            {garageAuthed ? (
              <Link
                to="/garage"
                className="flex items-center gap-4 w-full max-w-[440px] border-[1.5px] border-primary rounded-sm bg-primary/10 hover:bg-primary/15 transition-colors p-5 mb-4"
              >
                <span className="w-14 h-14 shrink-0 rounded-sm bg-primary/20 flex items-center justify-center">
                  <Icon name="Warehouse" className="text-primary" size={30} />
                </span>
                <span className="flex flex-col">
                  <span className="font-head font-bold uppercase tracking-[0.1em] text-lg text-foreground">
                    В гараж
                  </span>
                  <span className="text-muted-foreground text-sm">
                    Заявки оформляются через личный кабинет
                  </span>
                </span>
                <Icon
                  name="ChevronRight"
                  className="text-primary ml-auto"
                  size={22}
                />
              </Link>
            ) : (
              <>
                <p className="max-w-[34ch] text-muted-foreground leading-relaxed text-base sm:text-lg mb-4">
                  Напишите VIN / Frame-номер автомобиля, или отправьте фото СТС
                </p>
                {photoPreviews.length > 0 && (
                  <p className="text-primary text-xs mb-4 flex items-center gap-1.5">
                    <Icon name="Check" size={14} />
                    {photoPreviews.length === 1
                      ? "Фото прикреплено"
                      : `Фото прикреплено: ${photoPreviews.length}`}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-[440px] sm:max-w-[520px]">
                  <div className="flex items-stretch gap-2 min-w-0">
                    <PhotoAttach
                      photos={photos}
                      photoPreviews={photoPreviews}
                      onAdd={handleAddPhotos}
                      onRemove={removePhoto}
                    />
                    <div className="flex items-stretch flex-1 min-w-0 sm:hidden border-[1.5px] border-steel rounded-sm bg-card overflow-hidden">
                      <input
                        form="hero-vin-form"
                        value={vin}
                        onChange={(e) =>
                          setVin(sanitizeHeroVin(e.target.value))
                        }
                        maxLength={17}
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="XW8ZZZ • • • •"
                        aria-label="VIN-код автомобиля"
                        className="flex-1 min-w-0 bg-transparent text-foreground text-sm tracking-[0.1em] px-3 outline-none placeholder:text-steel"
                      />
                    </div>
                  </div>
                  <form
                    id="hero-vin-form"
                    onSubmit={submit}
                    className="hidden sm:flex items-stretch flex-1 min-w-0 border-[1.5px] border-steel rounded-sm bg-card overflow-hidden"
                  >
                    <span className="hidden sm:flex items-center px-4 font-head font-bold tracking-[0.12em] text-sm text-muted-foreground border-r-[1.5px] border-steel bg-steel-dark shrink-0">
                      VIN
                    </span>
                    <input
                      value={vin}
                      onChange={(e) => setVin(sanitizeHeroVin(e.target.value))}
                      maxLength={17}
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="XW8ZZZ • • • •"
                      aria-label="VIN-код автомобиля"
                      className="flex-1 min-w-0 bg-transparent text-foreground text-sm tracking-[0.16em] px-4 outline-none placeholder:text-steel"
                    />
                    <button
                      type="submit"
                      className="shrink-0 bg-primary text-primary-foreground font-head font-bold uppercase tracking-[0.1em] text-sm px-5 hover:brightness-110 transition"
                    >
                      Подобрать
                    </button>
                  </form>
                  <button
                    type="submit"
                    form="hero-vin-form"
                    className="sm:hidden shrink-0 bg-primary text-primary-foreground font-head font-bold uppercase tracking-[0.1em] text-sm px-5 py-3 rounded-sm hover:brightness-110 transition"
                  >
                    Подобрать
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 flex flex-col items-start gap-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-2">
                <i className="w-1.5 h-1.5 bg-primary inline-block rotate-45" />
                Все запчасти проверены на подлинность
              </span>
              <span className="flex items-center gap-2">
                <i className="w-1.5 h-1.5 bg-primary inline-block rotate-45" />
                Оптовые цены. <span className="text-primary">Кэшбэк 3%</span>
              </span>
            </div>
          </div>

          {/* signature: cut-out gear silhouette */}
          <div
            className="relative hidden lg:flex items-center justify-center h-full animate-scale-in"
            aria-hidden="true"
          >
            <div
              className="relative w-[460px] h-[460px]"
              style={{
                filter: "drop-shadow(-18px 22px 0 hsl(var(--steel-dark)))",
              }}
            >
              <svg viewBox="0 0 200 200" width="460" height="460">
                <g className="animate-gear-spin">
                  <path
                    fill="hsl(var(--steel))"
                    d="M100 6l9 3 6-8 10 5 2 10 10 1 5 10-6 9 8 7-2 11-10 3 3 10-8 7-9-4-4 9-11 1-6-8-9 4-9-7 1-10-10-3-2-11 8-7-6-9 5-10 10-1 2-10 10-5 6 8z"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="62"
                    fill="hsl(var(--background))"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="62"
                    fill="none"
                    stroke="hsl(var(--steel-dark))"
                    strokeWidth="10"
                  />
                </g>
                <circle
                  className="animate-gear-dash"
                  cx="100"
                  cy="100"
                  r="76"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeDasharray="26 20"
                  opacity="0.9"
                />
              </svg>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="block font-head font-medium uppercase tracking-[0.3em] text-xs text-muted-foreground mb-2">
                  Ваш автомобиль
                </span>
                <span className="font-body font-medium tracking-[0.14em] text-xl text-foreground">
                  XW8&nbsp;<b className="text-primary font-medium">ZZZ</b>
                  &nbsp;3G2
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;