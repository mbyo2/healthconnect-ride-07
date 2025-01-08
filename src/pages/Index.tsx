import { SymptomCollector } from '@/components/SymptomCollector';
import { ProviderList } from '@/components/ProviderList';

const Index = () => {
  const handleSymptomSubmit = (symptoms: string, urgency: string) => {
    console.log('Symptoms:', symptoms, 'Urgency:', urgency);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Find Healthcare Providers</h1>
      <SymptomCollector onSubmit={handleSymptomSubmit} />
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Available Providers</h2>
        <ProviderList />
      </div>
    </div>
  );
};

export default Index;