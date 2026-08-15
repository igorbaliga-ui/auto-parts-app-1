import { Link } from "react-router-dom";
import PageBackground from "@/components/site/PageBackground";
import InstallGuideContent from "@/components/site/InstallGuideContent";
import Icon from "@/components/ui/icon";

/** Отдельная страница (не модальное окно) с инструкцией «Установка приложения» —
 * именно на неё ведёт реферальная ссылка друга (/install?ref=CODE). Сделана
 * отдельным маршрутом, как /admin: iOS Safari и Chrome на Android при
 * «Добавить на экран Домой» / «Установить приложение» берут стартовый адрес
 * ярлыка из статичного файла манифеста, привязанного к текущему пути
 * (см. install-manifest.webmanifest и ветку location.pathname в index.html) —
 * значит сам путь должен быть постоянным, а не query-параметром на главной. */
const Install = () => (
  <PageBackground>
    <div className="max-w-[560px] mx-auto px-5 sm:px-8 pt-10 pb-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <Icon name="ArrowLeft" size={16} />
        На главную
      </Link>

      <h1 className="font-head uppercase tracking-wide text-2xl sm:text-3xl">
        Установка приложения
      </h1>
      <p className="text-muted-foreground mt-2">
        Наш сайт работает как приложение — установите его на телефон в один
        клик, без App Store и Google Play.
      </p>

      <InstallGuideContent />
    </div>
  </PageBackground>
);

export default Install;
