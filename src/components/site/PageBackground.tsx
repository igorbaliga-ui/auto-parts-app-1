import { ReactNode } from 'react';

// Сам фон теперь общий на всё приложение (см. AppBackground, подключён в App.tsx
// вне <Routes>) — здесь он больше не рисуется, чтобы не перерисовываться и не
// "моргать" при переходах между страницами.
const PageBackground = ({ children }: { children: ReactNode }) => (
  <div className="relative min-h-screen">
    <div className="relative z-20">{children}</div>
  </div>
);

export default PageBackground;