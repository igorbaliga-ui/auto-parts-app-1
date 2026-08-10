import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useRequest } from "./RequestDialog";
import { useGarageAuth } from "@/hooks/use-garage-auth";

const SITE_CONTACTS_URL = "https://functions.poehali.dev/2da0d397-3cdf-4621-8dce-e973cad2dc6d";

const defaultContactsData = {
  phone_value: "+7 (932) 402-79-37",
  phone_href: "tel:+79324027937",
  email_value: "zapoptom@bk.ru",
  email_href: "mailto:zapoptom@bk.ru",
  address_value: "г. Сургут, ул. Республики, 71/3с1",
  hours_value: "Пн–Сб, 9:00–20:00",
  whatsapp_href: null as string | null,
  telegram_href: null as string | null,
  vk_href: null as string | null,
  instagram_href: null as string | null,
};

const socialLinks = [
  { key: "whatsapp_href", icon: "MessageCircle", label: "WhatsApp" },
  { key: "telegram_href", icon: "Send", label: "Telegram" },
  { key: "vk_href", icon: "Share2", label: "ВКонтакте" },
  { key: "instagram_href", icon: "Instagram", label: "Instagram" },
] as const;

const Contacts = () => {
  const { open } = useRequest();
  const { authed: garageAuthed } = useGarageAuth();
  const [data, setData] = useState(defaultContactsData);

  useEffect(() => {
    fetch(SITE_CONTACTS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, []);

  const contacts = [
    {
      icon: "Phone",
      label: "Телефон",
      value: data.phone_value,
      href: data.phone_href,
    },
    {
      icon: "Mail",
      label: "Почта",
      value: data.email_value,
      href: data.email_href,
    },
    {
      icon: "MapPin",
      label: "Склад",
      value: data.address_value,
      href: "#",
    },
    {
      icon: "Clock",
      label: "Часы работы",
      value: data.hours_value,
      href: "#",
    },
  ];

  return (
    <section id="contacts" className="bg-background py-20 sm:py-28">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-14">
        <div>
          <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-5">
            <i className="w-11 h-0.5 bg-primary inline-block" />
            Контакты
          </span>
          <h2 className="font-head font-bold uppercase leading-[0.95] tracking-[-0.02em] text-4xl sm:text-5xl mb-6">
            Свяжитесь
            <br />
            <span className="text-primary">с нами</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-[42ch] mb-8"></p>
          {!garageAuthed && (
            <Button
              onClick={() => open()}
              className="font-head uppercase tracking-wide font-bold h-12 px-8"
            >
              Оставить заявку
            </Button>
          )}
          {socialLinks.some((s) => data[s.key]) && (
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map(
                (s) =>
                  data[s.key] && (
                    <a
                      key={s.key}
                      href={data[s.key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      title={s.label}
                      className="w-11 h-11 rounded-sm bg-card border border-steel/60 flex items-center justify-center hover:border-primary/60 hover:text-primary transition-colors"
                    >
                      <Icon name={s.icon} size={20} />
                    </a>
                  ),
              )}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="bg-card border border-steel/60 rounded-sm p-6 flex flex-col gap-3 hover:border-primary/60 transition-colors"
            >
              <span className="w-11 h-11 rounded-sm bg-primary/15 flex items-center justify-center">
                <Icon name={c.icon} className="text-primary" size={20} />
              </span>
              <span className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                {c.label}
              </span>
              <span className="font-head text-lg">{c.value}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contacts;