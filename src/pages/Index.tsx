import { RequestProvider } from '@/components/site/RequestDialog';
import { NavProvider, useNav } from '@/components/site/NavContext';
import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import VinForm from '@/components/site/VinForm';
import HowToOrder from '@/components/site/HowToOrder';
import Advantages from '@/components/site/Advantages';
import Contacts from '@/components/site/Contacts';
import PromoBanner from '@/components/site/PromoBanner';
import Footer from '@/components/site/Footer';
import FloatingContactButton from '@/components/site/FloatingContactButton';

const PageContent = () => {
  const { tab } = useNav();

  return (
    <div className="min-h-screen text-foreground font-body animate-fade-in-slow">
      <Header />
      <main>
        {tab === 'home' && <Hero />}
        {tab !== 'home' && (
          <div className="pt-28 sm:pt-32">
            {tab === 'vin' && <VinForm />}
            {tab === 'how' && <HowToOrder />}
            {tab === 'advantages' && <Advantages />}
            {tab === 'contacts' && <Contacts />}
          </div>
        )}
      </main>
      <PromoBanner />
      <Footer />
      <FloatingContactButton />
    </div>
  );
};

const Index = () => (
  <RequestProvider>
    <NavProvider>
      <PageContent />
    </NavProvider>
  </RequestProvider>
);

export default Index;