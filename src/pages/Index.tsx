import { Hero } from "@/components/Hero";
import { ProviderList } from "@/components/ProviderList";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <ProviderList />
    </div>
  );
};

export default Index;