import { ProviderList } from "@/components/ProviderList";
import { Header } from "@/components/Header";

const Search = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14">
        <ProviderList />
      </main>
    </div>
  );
};

export default Search;