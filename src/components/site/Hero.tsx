import { useState } from 'react';
import { useRequest } from './RequestDialog';
import heroBg from '@/assets/hero-bg.webp';

const Hero = () => {
  const { open } = useRequest();
  const [vin, setVin] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    open(vin);
  };

  return (
    <section
      id="top"
      className="relative min-h-screen overflow-hidden hero-vignette bg-background"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-background/70" aria-hidden="true" />

      <div className="relative z-20 max-w-[1400px] mx-auto min-h-screen flex items-center px-5 sm:px-8 lg:px-12 pt-28 pb-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-10 w-full">
          {/* copy */}
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-6">
              <i className="w-11 h-0.5 bg-primary inline-block" />
              Подбор по VIN
            </span>

            <h1 className="font-head font-bold uppercase leading-[0.92] tracking-[-0.03em] text-[15vw] sm:text-6xl lg:text-[5.1rem] mb-6">
              Введи&nbsp;VIN&nbsp;—<br />
              <span className="text-primary">получи</span>{' '}
              <span className="font-medium text-muted-foreground">нужную</span>
              <br />
              деталь
            </h1>

            <p className="max-w-[30ch] text-muted-foreground leading-relaxed text-base sm:text-lg mb-8 text-center">
              Напишите VIN или Frame-номер автомобиля, и мы подберём для вас
              оригинал и аналоги интересующих запчастей.
            </p>

            <form
              onSubmit={submit}
              className="flex items-stretch max-w-[440px] border-[1.5px] border-steel rounded-sm bg-card overflow-hidden"
            >
              <span className="flex items-center px-4 font-head font-bold tracking-[0.12em] text-sm text-muted-foreground border-r-[1.5px] border-steel bg-steel-dark">
                VIN
              </span>
              <input
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                maxLength={17}
                type="text"
                placeholder="XW8ZZZ • • • • • • •"
                aria-label="VIN-код автомобиля"
                className="flex-1 min-w-0 bg-transparent text-foreground text-sm tracking-[0.16em] px-4 outline-none placeholder:text-steel"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground font-head font-bold uppercase tracking-[0.1em] text-sm px-5 hover:brightness-110 transition"
              >
                Подобрать
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-2">
                <i className="w-1.5 h-1.5 bg-primary inline-block rotate-45" />
                Ответ за 15&nbsp;минут
              </span>
              <span className="flex items-center gap-2">
                <i className="w-1.5 h-1.5 bg-primary inline-block rotate-45" />
                Проверенные автозапчасти
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
                filter: 'drop-shadow(-18px 22px 0 hsl(var(--steel-dark)))',
              }}
            >
              <svg viewBox="0 0 200 200" width="460" height="460">
                <g className="animate-gear-spin">
                  <path
                    fill="hsl(var(--steel))"
                    d="M100 6l9 3 6-8 10 5 2 10 10 1 5 10-6 9 8 7-2 11-10 3 3 10-8 7-9-4-4 9-11 1-6-8-9 4-9-7 1-10-10-3-2-11 8-7-6-9 5-10 10-1 2-10 10-5 6 8z"
                  />
                  <circle cx="100" cy="100" r="62" fill="hsl(var(--background))" />
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
                  XW8&nbsp;<b className="text-primary font-medium">ZZZ</b>&nbsp;3G2
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