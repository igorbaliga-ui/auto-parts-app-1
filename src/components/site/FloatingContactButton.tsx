import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const SITE_CONTACTS_URL = "https://functions.poehali.dev/2da0d397-3cdf-4621-8dce-e973cad2dc6d";

// Шаблон первого сообщения — подставляется в поле ввода чата автоматически (сам текст
// клиент всё равно отправляет вручную, это защита мессенджеров от автоспама), поэтому
// менеджер по этой фразе сразу видит, что клиент написал именно с сайта/приложения,
// а не нашёл номер где-то ещё.
const PREFILLED_MESSAGE = "Здравствуйте! Пишу с сайта ЗАП ОПТОМ, хочу подобрать запчасть.";

type ContactLink = {
  href: string;
  icon: string;
  label: string;
};

// И WhatsApp (wa.me), и Telegram (t.me, только для ссылок по @username, не по номеру
// телефона) поддерживают параметр text= — он заранее заполняет поле ввода чата.
const withPrefilledText = (url: string, text: string) => {
  try {
    const u = new URL(url);
    u.searchParams.set("text", text);
    return u.toString();
  } catch {
    return url;
  }
};

/**
 * Плавающая кнопка связи в правом нижнем углу экрана — всегда видна поверх контента
 * при скролле. Ведёт в WhatsApp, если ссылка задана в /admin («Контакты»), иначе
 * в Telegram. Если обе ссылки пустые — кнопка не показывается. Открывает чат сразу
 * с заготовленной фразой в поле ввода — так менеджер понимает, что клиент пришёл с сайта.
 */
const FloatingContactButton = () => {
  const [link, setLink] = useState<ContactLink | null>(null);

  useEffect(() => {
    fetch(SITE_CONTACTS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.whatsapp_href) {
          setLink({
            href: withPrefilledText(d.whatsapp_href, PREFILLED_MESSAGE),
            icon: "MessageCircle",
            label: "Написать в WhatsApp",
          });
          return;
        }
        if (d.telegram_href) {
          setLink({
            href: withPrefilledText(d.telegram_href, PREFILLED_MESSAGE),
            icon: "Send",
            label: "Написать в Telegram",
          });
          return;
        }
        // Пока в /admin не указана явная ссылка на WhatsApp/Telegram — собираем
        // ссылку для быстрого чата из уже заполненного номера телефона, чтобы
        // кнопка работала сразу «из коробки», а не оставалась скрытой.
        const digits = (d.phone_value || "").replace(/\D/g, "");
        if (digits) {
          setLink({
            href: withPrefilledText(`https://wa.me/${digits}`, PREFILLED_MESSAGE),
            icon: "MessageCircle",
            label: "Написать в WhatsApp",
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!link) return null;

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={link.label}
      title={link.label}
      className="fixed bottom-16 right-5 sm:bottom-20 sm:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:brightness-110 hover:scale-105 transition-all animate-float-pulse"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Icon name={link.icon} size={26} />
    </a>
  );
};

export default FloatingContactButton;