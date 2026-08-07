import { ReactNode } from 'react';
import heroBg from '@/assets/hero-bg.webp';

const PageBackground = ({ children }: { children: ReactNode }) => (
  <div className="relative min-h-screen bg-background">
    <div
      className="fixed inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${heroBg})` }}
      aria-hidden="true"
    />
    <div className="fixed inset-0 bg-background/70" aria-hidden="true" />
    <div className="fixed inset-0 hero-vignette" aria-hidden="true" />
    <div className="relative z-20">{children}</div>
  </div>
);

export default PageBackground;