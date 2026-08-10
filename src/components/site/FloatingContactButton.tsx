import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const SITE_CONTACTS_URL = "https://functions.poehali.dev/2da0d397-3cdf-4621-8dce-e973cad2dc6d";

type ContactLink = {
  href: string;
  icon: string;
  label: string;
};

/**
 * Плавающая кнопка связи в правом нижнем углу экрана — всегда видна поверх контента
 * при скролле. Ведёт в WhatsApp, если ссылка задана в /admin («Контакты»), иначе
 * в Telegram. Если обе ссылки пустые — кнопка не показывается.
 */
const FloatingContactButton = () => {
  const [link, setLink] = useState<ContactLink | null>(null);

  useEffect(() => {
    fetch(SITE_CONTACTS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.whatsapp_href) {
          setLink({ href: d.whatsapp_href, icon: "MessageCircle", label: "Написать в WhatsApp" });
          return;
        }
        if (d.telegram_href) {
          setLink({ href: d.telegram_href, icon: "Send", label: "Написать в Telegram" });
          return;
        }
        // Пока в /admin не указана явная ссылка на WhatsApp/Telegram — собираем
        // ссылку для быстрого чата из уже заполненного номера телефона, чтобы
        // кнопка работала сразу «из коробки», а не оставалась скрытой.
        const digits = (d.phone_value || "").replace(/\D/g, "");
        if (digits) {
          setLink({ href: `https://wa.me/${digits}`, icon: "MessageCircle", label: "Написать в WhatsApp" });
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
      className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:brightness-110 hover:scale-105 transition-all animate-float-pulse"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Icon name={link.icon} size={26} />
    </a>
  );
};

export default FloatingContactButton;