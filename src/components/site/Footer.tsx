const Footer = () => {
  return (
    <footer className="border-t border-border/60">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-5 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} ЗАП ОПТОМ. Все права защищены.</span>
      </div>
    </footer>
  );
};

export default Footer;
