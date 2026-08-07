import heroBg from '@/assets/hero-bg.webp';

/**
 * Единый фон на весь сайт: рендерится один раз в корне приложения (App.tsx),
 * вне <Routes>, поэтому не размонтируется и не перерисовывается при переходах
 * между страницами (/, /garage, /admin) — переходы становятся плавными, без
 * характерного "моргания" фона.
 */
const AppBackground = () => (
  <div className="fixed inset-0 -z-10" aria-hidden="true">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${heroBg})` }}
    />
    <div className="absolute inset-0 bg-background/70" />
    <div className="absolute inset-0 hero-vignette" />
  </div>
);

export default AppBackground;
