import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { useNav, Tab } from '@/components/site/NavContext';
import { useGarageAuth } from '@/hooks/use-garage-auth';
import InstallGuide from './InstallGuide';

const links: { label: string; tab: Tab }[] = [
  { label: 'Как заказать', tab: 'how' },
  { label: 'Преимущества', tab: 'advantages' },
  { label: 'Контакты', tab: 'contacts' },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'ios' | 'android'>('ios');
  const { goTo } = useNav();
  const { authed: garageAuthed } = useGarageAuth();

  const openGuide = (tab: 'ios' | 'android') => {
    setOpen(false);
    setGuideTab(tab);
    setGuideOpen(true);
  };

  const navigate = (tab: Tab) => {
    setOpen(false);
    goTo(tab);
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30">
      <div className="max-w-[1400px] mx-auto flex items-center px-5 sm:px-8 lg:px-12 py-6">
        <button
          onClick={() => navigate('home')}
          className="flex items-center"
        >
          <span className="font-head font-bold uppercase tracking-[0.18em] text-lg sm:text-xl text-concrete-carved">
            ЗАП&nbsp;Оптом
          </span>
        </button>

        <div
          className="flex items-center gap-0.5 ml-4 px-1.5 py-1 rounded-full border border-border/60 bg-card/40"
          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.04)' }}
        >
          <button
            onClick={() => openGuide('ios')}
            aria-label="Установить на iPhone"
            title="Установить на iPhone"
            className="flex items-center justify-center w-8 h-8 text-slate-200 hover:text-white hover:scale-110 transition-all"
          >
            <Icon name="Apple" size={17} />
          </button>
          <button
            onClick={() => openGuide('android')}
            aria-label="Установить на Android"
            title="Установить на Android"
            className="flex items-center justify-center w-8 h-8 text-[#3DDC84] hover:brightness-125 hover:scale-110 transition-all"
          >
            <Icon name="Smartphone" size={17} />
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
              key={l.tab}
              onClick={() => navigate(l.tab)}
              className="font-head font-medium uppercase tracking-[0.14em] text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/garage"
            className={`relative flex items-center gap-1.5 font-head font-medium uppercase tracking-[0.14em] text-xs transition-colors ${
              garageAuthed ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <span className="relative">
              <Icon name="Warehouse" size={14} />
              {garageAuthed && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary border border-background" />
              )}
            </span>
            Гараж
            {garageAuthed && (
              <span className="flex items-center gap-1 text-[0.65rem] normal-case tracking-normal text-primary/80">
                <Icon name="Check" size={11} />
                Вы вошли
              </span>
            )}
          </Link>
        </nav>

        <div className="md:hidden flex items-center gap-3 ml-auto">
          <Link
            to="/garage"
            aria-label={garageAuthed ? 'Гараж — вы вошли' : 'Гараж'}
            title={garageAuthed ? 'Гараж — вы вошли' : 'Гараж'}
            className={`relative flex items-center justify-center w-9 h-9 transition-colors ${
              garageAuthed ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <Icon name="Warehouse" size={22} />
            {garageAuthed && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border border-background" />
            )}
          </Link>
          <button
            className="text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            <Icon name={open ? 'X' : 'Menu'} size={26} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-card/95 backdrop-blur border-y border-border animate-fade-in">
          <nav className="flex flex-col px-5 py-4">
            {links.map((l) => (
              <button
                key={l.tab}
                onClick={() => navigate(l.tab)}
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