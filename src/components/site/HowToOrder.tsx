import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useRequest } from './RequestDialog';
import { useGarageAuth } from '@/hooks/use-garage-auth';

const steps = [
  {
    n: '01',
    icon: 'ScanLine',
    title: 'Отправляете VIN',
    text: 'Указываете 17-значный VIN-код, контакты и список нужных деталей в форме на сайте.',
  },
  {
    n: '02',
    icon: 'Search',
    title: 'Подбираем деталь',
    text: 'Определяем модель и комплектацию, находим оригинал или проверенный аналог.',
  },
  {
    n: '03',
    icon: 'ReceiptText',
    title: 'Считаем и согласуем',
    text: 'Присылаем цену, наличие и срок поставки. Вы подтверждаете заказ.',
  },
  {
    n: '04',
    icon: 'Truck',
    title: 'Доставляем',
    text: 'Отправляем запчасти по России или выдаём со склада. Опт — на особых условиях.',
  },
];

const HowToOrder = () => {
  const { open } = useRequest();
  const { authed: garageAuthed } = useGarageAuth();
  return (
    <section id="how" className="bg-background py-20 sm:py-28">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-5">
            <i className="w-11 h-0.5 bg-primary inline-block" />
            Как заказать
          </span>
          <h2 className="font-head font-bold uppercase leading-[0.95] tracking-[-0.02em] text-4xl sm:text-5xl">
            Четыре шага<br />
            <span className="text-primary">до нужной детали</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-steel/40 border border-steel/40 rounded-sm overflow-hidden">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group bg-card p-7 flex flex-col gap-4 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-sm bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                  <Icon name={s.icon} className="text-primary" size={22} />
                </span>
                <span className="font-head font-bold text-4xl text-steel">{s.n}</span>
              </div>
              <h3 className="font-head uppercase tracking-wide text-xl">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        {!garageAuthed && (
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
            <Button
              onClick={() => open()}
              className="font-head uppercase tracking-wide font-bold h-12 px-8"
            >
              Оставить заявку
            </Button>
            <span className="text-muted-foreground text-sm"></span>
          </div>
        )}
      </div>
    </section>
  );
};

export default HowToOrder;