import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useLastVin } from "@/hooks/use-last-vin";
import { useNav } from "./NavContext";

const SITE_CONTACTS_URL = "https://functions.poehali.dev/2da0d397-3cdf-4621-8dce-e973cad2dc6d";

// Базовый шаблон сообщения без VIN — используется, пока клиент ещё нигде на сайте
// не вводил VIN-номер (например только зашёл на главную).
const BASE_MESSAGE = "Здравствуйте! Пишу с сайта ЗАП ОПТОМ, хочу подобрать запчасть.";

// Если VIN уже известен (клиент вводил его в форме на главной, в разделе «Подбор по
// VIN» или в диалоге заявки) — сразу включаем его в текст, чтобы менеджеру не пришлось
// переспрашивать и клиенту не пришлось вводить его снова в чате.
const buildMessage = (vin: string) =>
  vin
    ? `Здравствуйте! Пишу с сайта ЗАП ОПТОМ, хочу подобрать запчасть на авто с VIN ${vin}.`
    : BASE_MESSAGE;

type BaseLink = {
  href: string;
  icon: string;
  label: string;
};

// И WhatsApp (wa.me), и Telegram (t.me, только для ссылок по @username, не по номеру
// телефона) поддерживают параметр text= — он заранее заполняет поле ввода чата (сам
// текст клиент всё равно отправляет вручную — это защита мессенджеров от автоспама).
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
 * в Telegram. Если обе ссылки пустые — кнопка не показывается. Текст сообщения меняется
 * в зависимости от того, что клиент уже делал на сайте — если вводил VIN, он сразу
 * подставляется в сообщение.
 */
const FloatingContactButton = () => {
  const [baseLink, setBaseLink] = useState<BaseLink | null>(null);
  const { tab } = useNav();
  const lastVin = useLastVin();

  useEffect(() => {
    fetch(SITE_CONTACTS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!d) return;
        // Кнопку можно полностью скрыть с сайта переключателем в /admin
        if (d.floating_button_visible === false) return;
        if (d.whatsapp_href) {
          setBaseLink({ href: d.whatsapp_href, icon: "MessageCircle", label: "Написать в WhatsApp" });
          return;
        }
        if (d.telegram_href) {
          setBaseLink({ href: d.telegram_href, icon: "Send", label: "Написать в Telegram" });
          return;
        }
        // Пока в /admin не указана явная ссылка на WhatsApp/Telegram — собираем
        // ссылку для быстрого чата из уже заполненного номера телефона, чтобы
        // кнопка работала сразу «из коробки», а не оставалась скрытой.
        const digits = (d.phone_value || "").replace(/\D/g, "");
        if (digits) {
          setBaseLink({ href: `https://wa.me/${digits}`, icon: "MessageCircle", label: "Написать в WhatsApp" });
        }
      })
      .catch(() => {});
  }, []);

  // Текст сообщения зависит от текущего раздела сайта и от того, вводил ли клиент
  // VIN где-либо ранее — пересчитывается при каждой смене раздела или появлении VIN.
  const message = useMemo(() => {
    if (lastVin) return buildMessage(lastVin);
    if (tab === "contacts") {
      return "Здравствуйте! Пишу со страницы контактов сайта ЗАП ОПТОМ.";
    }
    return BASE_MESSAGE;
  }, [lastVin, tab]);

  if (!baseLink) return null;

  return (
    <a
      href={withPrefilledText(baseLink.href, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={baseLink.label}
      title={baseLink.label}
      className="fixed bottom-16 right-5 sm:bottom-20 sm:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:brightness-110 hover:scale-105 transition-all animate-float-pulse"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Icon name={baseLink.icon} size={26} />
    </a>
  );
};

export default FloatingContactButton;