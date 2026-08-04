const Footer = () => {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="ЗАП ОПТОМ"
            className="h-11 w-11 object-cover rounded-sm bg-steel-dark"
          />
          <div>
            <div className="font-head font-bold uppercase tracking-[0.18em]">
              ЗАП&nbsp;Оптом
            </div>
            <div className="text-muted-foreground text-sm">
              Проверенные автозапчасти по VIN
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-7 gap-y-2">
          {[
            { label: 'Подбор по VIN', href: '#vin' },
            { label: 'Как заказать', href: '#how' },
            { label: 'Преимущества', href: '#advantages' },
            { label: 'Контакты', href: '#contacts' },
          ].map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="font-head font-medium uppercase tracking-[0.14em] text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="border-t border-border/60">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} ЗАП ОПТОМ. Все права защищены.</span>
          <span>Опт для сервисов · Розница для водителей</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
