import { useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// index.html вешает свой слушатель 'beforeinstallprompt' синхронно, в самом
// начале <head> — раньше, чем React успевает смонтировать компонент и
// подписаться на событие здесь. Пойманное там событие кладётся сюда, и хук
// подхватывает его при монтировании (см. эффект ниже), иначе очень раннее
// событие терялось бы безвозвратно на этой загрузке страницы.
declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent;
  }
}

// Хранится в localStorage, чтобы "запомнить" установку между перезагрузками
// страницы: событие 'beforeinstallprompt' на Android после установки больше
// не срабатывает повторно в этой же вкладке браузера, поэтому без сохранённого
// флага при следующем визите canInstall снова стал бы false, а клик по иконке
// откатывался бы на устаревшую инструкцию вместо распознавания уже
// установленного приложения.
const PWA_INSTALLED_KEY = 'pwa-installed';
// Запоминаем сам факт, что браузер хоть раз предлагал установку на этом
// устройстве. Критерии установки (manifest + service worker) не меняются —
// единственная причина, по которой событие переставало бы приходить на
// следующих загрузках, это то, что приложение уже установлено (Chrome сам
// перестаёт предлагать установку для уже установленных PWA). Это подстраховка
// на случай, если 'appinstalled' не успел сработать (например, вкладку
// закрыли до его прихода) и флаг PWA_INSTALLED_KEY не сохранился.
const PWA_PROMPT_SEEN_KEY = 'pwa-prompt-seen';
// Даём событию 'beforeinstallprompt' шанс прийти на этой же загрузке страницы,
// прежде чем считать отсутствие события признаком того, что приложение уже
// установлено — на некоторых устройствах Chrome присылает его не мгновенно.
const PROMPT_GRACE_MS = 1500;

const isRunningStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    const early = (typeof window !== 'undefined' && window.__deferredPwaPrompt) || null;
    if (early) safeSetItem(PWA_PROMPT_SEEN_KEY, '1');
    return early;
  });
  const [installed, setInstalled] = useState(
    () => safeGetItem(PWA_INSTALLED_KEY) === '1' || isRunningStandalone(),
  );
  // true, если раньше на этом устройстве браузер уже показывал промпт установки
  const [promptSeenBefore] = useState(() => safeGetItem(PWA_PROMPT_SEEN_KEY) === '1');
  // true, как только PROMPT_GRACE_MS истекло без нового события на этой загрузке
  const [graceElapsed, setGraceElapsed] = useState(false);

  // Если сайт сейчас реально открыт в standalone-режиме — установка точно
  // есть, фиксируем это сразу вне зависимости от того, что успели поймать
  // события 'beforeinstallprompt'/'appinstalled' или нет.
  useEffect(() => {
    if (isRunningStandalone() && !installed) {
      setInstalled(true);
      safeSetItem(PWA_INSTALLED_KEY, '1');
    }
  }, [installed]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      safeSetItem(PWA_PROMPT_SEEN_KEY, '1');
    };
    const onInstalled = () => {
      setInstalled(true);
      safeSetItem(PWA_INSTALLED_KEY, '1');
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    const timer = window.setTimeout(() => setGraceElapsed(true), PROMPT_GRACE_MS);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  // Промпт уже показывался на этом устройстве раньше, но сейчас (спустя
  // разумное время ожидания) не пришёл повторно — значит, приложение,
  // вероятнее всего, уже установлено, хоть мы это и пропустили.
  useEffect(() => {
    if (graceElapsed && promptSeenBefore && !deferredPrompt && !installed) {
      setInstalled(true);
      safeSetItem(PWA_INSTALLED_KEY, '1');
    }
  }, [graceElapsed, promptSeenBefore, deferredPrompt, installed]);

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