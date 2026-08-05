import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useRequest } from './RequestDialog';
import { useGarageAuth } from '@/hooks/use-garage-auth';

const contacts = [
  { icon: 'Phone', label: 'Телефон', value: '+7 (900) 000-00-00', href: 'tel:+79000000000' },
  { icon: 'Mail', label: 'Почта', value: 'zakaz@zapoptom.ru', href: 'mailto:zakaz@zapoptom.ru' },
  { icon: 'MapPin', label: 'Склад', value: 'г. Москва, ул. Автозаводская, 1', href: '#' },
  { icon: 'Clock', label: 'Часы работы', value: 'Пн–Сб, 9:00–19:00', href: '#' },
];

const Contacts = () => {
  const { open } = useRequest();
  const { authed: garageAuthed } = useGarageAuth();
  return (
    <section id="contacts" className="bg-background py-20 sm:py-28">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-14">
        <div>
          <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-5">
            <i className="w-11 h-0.5 bg-primary inline-block" />
            Контакты
          </span>
          <h2 className="font-head font-bold uppercase leading-[0.95] tracking-[-0.02em] text-4xl sm:text-5xl mb-6">
            Свяжитесь<br />
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