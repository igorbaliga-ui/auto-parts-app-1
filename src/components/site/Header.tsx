import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { usePwaInstall } from '@/hooks/use-pwa-install';

const links = [
  { label: 'Подбор по VIN', href: '#vin' },
  { label: 'Как заказать', href: '#how' },
  { label: 'Преимущества', href: '#advantages' },
  { label: 'Контакты', href: '#contacts' },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-5 sm:px-8 lg:px-12 py-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="ЗАП ОПТОМ"
            className="h-10 w-10 object-cover rounded-sm bg-steel-dark"
          />
          <span className="font-head font-bold uppercase tracking-[0.18em] text-sm sm:text-base">
            ЗАП&nbsp;Оптом
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="font-head font-medium uppercase tracking-[0.14em] text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
          {canInstall && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-2 font-head font-medium uppercase tracking-[0.14em] text-xs text-primary hover:text-primary/80 transition-colors border border-primary/60 rounded-sm px-3 py-2"
            >
              <Icon name="Download" size={14} />
              Установить
            </button>
          )}
        </nav>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          <Icon name={open ? 'X' : 'Menu'} size={26} />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-card/95 backdrop-blur border-y border-border animate-fade-in">
          <nav className="flex flex-col px-5 py-4">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-left font-head font-medium uppercase tracking-[0.14em] text-sm text-muted-foreground hover:text-foreground py-3 border-b border-border/50 last:border-0"
              >
                {l.label}
              </button>
            ))}
            {canInstall && (
              <button
                onClick={() => {
                  setOpen(false);
                  promptInstall();
                }}
                className="flex items-center gap-2 text-left font-head font-medium uppercase tracking-[0.14em] text-sm text-primary py-3"
              >
                <Icon name="Download" size={16} />
                Установить приложение
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;