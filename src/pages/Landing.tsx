import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/ui/AppLogo";
import { 
  Search, MapPin, Calendar, Video, Shield, Star, 
  CheckCircle, Users, Building2, Pill, Clock, ArrowRight,
  Smartphone, Heart, Activity
} from "lucide-react";
import { ZAMBIAN_STATS } from "@/config/zambia";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      title: "Find Doctors Instantly",
      description: "Search by specialty, location, or insurance. Book same-day appointments.",
      color: "text-blue-600 bg-blue-500/10"
    },
    {
      icon: Video,
      title: "Video Consultations",
      description: "Connect with doctors from anywhere via secure video calls.",
      color: "text-emerald-600 bg-emerald-500/10"
    },
    {
      icon: Calendar,
      title: "Easy Scheduling",
      description: "Book, reschedule, or cancel appointments with a single tap.",
      color: "text-purple-600 bg-purple-500/10"
    },
    {
      icon: Shield,
      title: "Insurance Verified",
      description: "NHIMA partner. Check coverage before you book.",
      color: "text-orange-600 bg-orange-500/10"
    }
  ];

  const howItWorks = [
    { step: "1", title: "Search", description: "Find doctors by specialty or condition" },
    { step: "2", title: "Compare", description: "Read reviews, check availability" },
    { step: "3", title: "Book", description: "Schedule your appointment instantly" },
    { step: "4", title: "Visit", description: "See your doctor in-person or online" }
  ];

  const specialties = [
    "General Practice", "Cardiology", "Dermatology", "Pediatrics",
    "Gynecology", "Orthopedics", "Psychiatry", "Dentistry"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <AppLogo size="sm" />
            <span className="font-bold text-xl text-foreground">Doc' O Clock</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button onClick={() => navigate('/auth?tab=signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <Hero />

        {/* Trust Stats Bar */}
        <section className="bg-primary py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-primary-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-bold">{ZAMBIAN_STATS.patients}</span>
                <span className="text-sm opacity-90">Patients</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <span className="font-bold">{ZAMBIAN_STATS.doctors}</span>
                <span className="text-sm opacity-90">Doctors</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span className="font-bold">{ZAMBIAN_STATS.hospitals}</span>
                <span className="text-sm opacity-90">Hospitals</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-current" />
                <span className="font-bold">4.8/5</span>
                <span className="text-sm opacity-90">Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Healthcare Made Simple
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to manage your health, all in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                      <feature.icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Book an Appointment in Minutes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {howItWorks.map((item, idx) => (
                <div key={idx} className="text-center relative">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {idx < howItWorks.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-8 -right-4 h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button size="lg" onClick={() => navigate('/auth?tab=signup')} className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Browse by Specialty */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Specialties</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Find Care by Specialty
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {specialties.map((specialty, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="rounded-full"
                  onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
                >
                  {specialty}
                </Button>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="link" onClick={() => navigate('/search')} className="gap-1">
                View All Specialties
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials">
          <Testimonials />
        </section>

        {/* Mobile App CTA */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary to-primary/80">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-primary-foreground">
                <Badge className="bg-white/20 text-white border-white/30 mb-4">Mobile App</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your Health, In Your Pocket
                </h2>
                <p className="text-lg opacity-90 mb-6">
                  Download the Doc' O Clock app for the best mobile experience. Book appointments, chat with doctors, and manage your health on the go.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="secondary" size="lg" className="gap-2">
                    <Smartphone className="h-5 w-5" />
                    Download App
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-primary-foreground">
                      <p className="font-semibold">Health at Your Fingertips</p>
                      <p className="text-sm opacity-80">24/7 Access to Care</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-primary-foreground">
                      <CheckCircle className="h-5 w-5" />
                      <span>Book appointments instantly</span>
                    </div>
                    <div className="flex items-center gap-3 text-primary-foreground">
                      <CheckCircle className="h-5 w-5" />
                      <span>Video consultations</span>
                    </div>
                    <div className="flex items-center gap-3 text-primary-foreground">
                      <CheckCircle className="h-5 w-5" />
                      <span>Prescription refills</span>
                    </div>
                    <div className="flex items-center gap-3 text-primary-foreground">
                      <CheckCircle className="h-5 w-5" />
                      <span>Health records access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <CtaSection />
      </main>

      {/* Footer */}
      <footer className="bg-muted py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">For Patients</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/search" className="hover:text-foreground">Find a Doctor</a></li>
                <li><a href="/healthcare-institutions" className="hover:text-foreground">Find a Hospital</a></li>
                <li><a href="/emergency" className="hover:text-foreground">Emergency Services</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">For Providers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/healthcare-application" className="hover:text-foreground">Join as Doctor</a></li>
                <li><a href="/institution-registration" className="hover:text-foreground">Register Hospital</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-foreground">About Us</a></li>
                <li><a href="/contact" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/terms" className="hover:text-foreground">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-foreground">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
              <span className="font-semibold text-foreground">Doc' O Clock</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Doc' O Clock. Made with ❤️ in Zambia 🇿🇲
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
