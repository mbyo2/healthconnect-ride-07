import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Hero />
      <div className="fixed bottom-8 left-4 right-4">
        <Button 
          className="w-full bg-primary text-white font-semibold py-6 rounded-xl shadow-lg"
          onClick={() => navigate('/home')}
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Landing;