import { useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Хранится в localStorage, чтобы "запомнить" установку между перезагрузками
// страницы: событие 'beforeinstallprompt' на Android после установки больше
// не срабатывает повторно в этой же вкладке браузера, поэтому без сохранённого
// флага при следующем визите canInstall снова стал бы false, а клик по иконке
// откатывался бы на устаревшую инструкцию вместо распознавания уже
// установленного приложения.
const PWA_INSTALLED_KEY = 'pwa-installed';

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => safeGetItem(PWA_INSTALLED_KEY) === '1');

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      safeSetItem(PWA_INSTALLED_KEY, '1');
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      safeSetItem(PWA_INSTALLED_KEY, '1');
    }
    setDeferredPrompt(null);
  };

  return { canInstall: !!deferredPrompt && !installed, installed, promptInstall };
};