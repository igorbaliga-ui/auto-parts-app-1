import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useIsStandalone } from '@/hooks/use-standalone';

type AdminInstallBannersProps = {
  canInstall: boolean;
  promptInstall: () => void;
  isIosInstallable: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  pushSubscribing: boolean;
  subscribePush: () => void;
};

const AdminInstallBanners = ({
  canInstall,
  promptInstall,
  isIosInstallable,
  pushPermission,
  pushSubscribing,
  subscribePush,
}: AdminInstallBannersProps) => {
  const isStandalone = useIsStandalone();

  const handleShare = async () => {
    const shareData = {
      title: 'ЗАП ОПТОМ — Заявки',
      text: 'Админка заявок ЗАП ОПТОМ',
      url: window.location.origin + '/admin-install.html',
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // пользователь отменил — ничего не делаем
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
    }
  };

  return (
    <>
      {isStandalone && (
        <div className="mb-4 flex items-center gap-3 bg-card border border-primary/40 rounded-sm p-3">
          <button
            onClick={handleShare}
            aria-label="Поделиться приложением"
            title="Поделиться приложением"
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors animate-share-glow"
          >
            <Icon name="Share2" size={16} />
          </button>
          <p className="text-sm text-muted-foreground">
            Поделитесь приложением с коллегами.
          </p>
        </div>
      )}
      {!isStandalone && canInstall && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-card border border-primary/40 rounded-sm p-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
              <Icon name="Smartphone" className="text-primary" size={18} />
            </span>
            <p className="text-sm text-muted-foreground">
              Установите админку на телефон как приложение — быстрый доступ и push-уведомления.
            </p>
          </div>
          <Button
            size="sm"
            onClick={promptInstall}
            className="font-head uppercase tracking-wide text-xs shrink-0"
          >
            Установить
          </Button>
        </div>
      )}
      {!isStandalone && isIosInstallable && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-card border border-primary/40 rounded-sm p-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
              <Icon name="Apple" className="text-primary" size={18} />
            </span>
            <p className="text-sm text-muted-foreground">
              На iPhone установка отдельным приложением работает только со специальной страницы.
            </p>
          </div>
          <a
            href="/admin-install.html"
            className="shrink-0 inline-flex items-center justify-center h-9 px-4 rounded-sm bg-primary text-primary-foreground font-head uppercase tracking-wide text-xs hover:brightness-110 transition-all"
          >
            Открыть
          </a>
        </div>
      )}
      {pushPermission !== 'unsupported' && pushPermission !== 'granted' && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-card border border-steel rounded-sm p-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
              <Icon name="Bell" className="text-primary" size={18} />
            </span>
            <p className="text-sm text-muted-foreground">
              Включите уведомления — сообщим о новых заявках, даже если приложение закрыто.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={pushSubscribing}
            onClick={subscribePush}
            className="font-head uppercase tracking-wide text-xs shrink-0"
          >
            {pushSubscribing ? 'Включаем…' : 'Включить'}
          </Button>
        </div>
      )}
    </>
  );
};

export default AdminInstallBanners;