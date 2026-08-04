import { RequestProvider } from '@/components/site/RequestDialog';
import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import VinForm from '@/components/site/VinForm';
import HowToOrder from '@/components/site/HowToOrder';
import Advantages from '@/components/site/Advantages';
import Contacts from '@/components/site/Contacts';
import Footer from '@/components/site/Footer';

const Index = () => {
  return (
    <RequestProvider>
      <div className="min-h-screen bg-background text-foreground font-body">
        <Header />
        <main>
          <Hero />
          <VinForm />
          <HowToOrder />
          <Advantages />
          <Contacts />
        </main>
        <Footer />
      </div>
    </RequestProvider>
  );
};

export default Index;
