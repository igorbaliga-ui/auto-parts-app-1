import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import InstallGuide from './InstallGuide';

const links = [
  { label: 'Подбор по VIN', href: '#vin' },
  { label: 'Как заказать', href: '#how' },
  { label: 'Преимущества', href: '#advantages' },
  { label: 'Контакты', href: '#contacts' },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'ios' | 'android'>('ios');

  const openGuide = (tab: 'ios' | 'android') => {
    setOpen(false);
    setGuideTab(tab);
    setGuideOpen(true);
  };

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30">
      <div className="max-w-[1400px] mx-auto flex items-center px-5 sm:px-8 lg:px-12 py-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center"
        >
          <span className="font-head font-bold uppercase tracking-[0.18em] text-lg sm:text-xl text-concrete-carved">
            ЗАП&nbsp;Оптом
          </span>
        </a>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => openGuide('ios')}
            aria-label="Установить на iPhone"
            title="Установить на iPhone"
            className="flex items-center justify-center w-9 h-9 text-slate-200 hover:text-white hover:scale-110 transition-all"
          >
            <Icon name="Apple" size={20} />
          </button>
          <button
            onClick={() => openGuide('android')}
            aria-label="Установить на Android"
            title="Установить на Android"
            className="flex items-center justify-center w-9 h-9 text-[#3DDC84] hover:brightness-125 hover:scale-110 transition-all"
          >
            <Icon name="Smartphone" size={20} />
          </button>
        </div>

        <InstallGuide key={guideTab} open={guideOpen} onOpenChange={setGuideOpen} defaultTab={guideTab} />
        {canInstall && (
          <button
            onClick={promptInstall}
            aria-label="Установить приложение"
            title="Установить приложение"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-sm border border-primary/60 text-primary hover:bg-primary/10 transition-colors"
          >
            <Icon name="Download" size={16} />
          </button>
        )}

        <nav className="hidden md:flex items-center gap-8 ml-auto">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="font-head font-medium uppercase tracking-[0.14em] text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/garage"
            className="flex items-center gap-1.5 font-head font-medium uppercase tracking-[0.14em] text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon name="Warehouse" size={14} />
            Гараж
          </Link>
        </nav>

        <button
          className="md:hidden text-foreground ml-auto"
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
            <Link
              to="/garage"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-left font-head font-medium uppercase tracking-[0.14em] text-sm text-muted-foreground hover:text-foreground py-3 border-b border-border/50"
            >
              <Icon name="Warehouse" size={16} />
              Гараж
            </Link>
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