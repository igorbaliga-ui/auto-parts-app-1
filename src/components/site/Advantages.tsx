import Icon from "@/components/ui/icon";

const items = [
  {
    icon: "ShieldCheck",
    title: "Гарантия",
    text: "Все запчасти проверяются на подлиннось. Гарантия на каждую позицию и возврат, если деталь не подошла.",
  },
  {
    icon: "Timer",
    title: "Сроки",
    text: "Наличные позиции — со склада в день заказа, остальные — в кратчайший срок.",
  },
  {
    icon: "Truck",
    title: "Доставка",
    text: "Отправка по всей России транспортными компаниями и курьером. Самовывоз со склада.",
  },
  {
    icon: "Layers",
    title: "Опт и розница",
    text: "Специальные цены для автосервисов и СТО, удобные условия для частных автовладельцев.",
  },
  {
    icon: "ScanLine",
    title: "Точный подбор",
    text: "Определяем деталь по VIN без ошибок — без каталожных номеров и долгих переписок.",
  },
  {
    icon: "Headset",
    title: "Поддержка",
    text: "Живой менеджер на связи: поможет с выбором аналога и подскажет по совместимости.",
  },
];

const Advantages = () => {
  return (
    <section
      id="advantages"
      className="bg-card border-y border-border py-20 sm:py-28"
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl mb-14">
          <span className="inline-flex items-center gap-3 font-head uppercase tracking-[0.32em] text-[0.72rem] text-primary mb-5">
            <i className="w-11 h-0.5 bg-primary inline-block" />
            Преимущества
          </span>
          <h2 className="font-head font-bold uppercase leading-[0.95] tracking-[-0.02em] text-4xl sm:text-5xl">
            Почему заказывают
            <br />
            <span className="text-primary">у нас</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((i) => (
            <div
              key={i.title}
              className="bg-background border border-steel/60 rounded-sm p-7 hover:border-primary/60 transition-colors"
            >
              <span className="w-12 h-12 rounded-sm bg-primary/15 flex items-center justify-center mb-5">
                <Icon name={i.icon} className="text-primary" size={24} />
              </span>
              <h3 className="font-head uppercase tracking-wide text-xl mb-2">
                {i.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {i.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Advantages;
