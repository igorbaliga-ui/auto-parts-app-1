import { createContext, useContext, useState, ReactNode } from 'react';

export type Tab = 'home' | 'vin' | 'how' | 'advantages' | 'contacts';

type Ctx = {
  tab: Tab;
  goTo: (tab: Tab) => void;
};

const NavContext = createContext<Ctx>({ tab: 'home', goTo: () => {} });

export const useNav = () => useContext(NavContext);

export const NavProvider = ({ children }: { children: ReactNode }) => {
  const [tab, setTab] = useState<Tab>('home');

  const goTo = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <NavContext.Provider value={{ tab, goTo }}>{children}</NavContext.Provider>;
};
