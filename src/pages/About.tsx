import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>About Doc&apos; O Clock</title>
      <meta name="description" content="Learn how Doc' O Clock connects patients, providers, pharmacies and healthcare institutions." />
    </Helmet>

    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/">
        <Button variant="ghost" className="mb-8 flex items-center gap-2"><ArrowLeft size={16} /> Back to Home</Button>
      </Link>

      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <section>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">About us</p>
          <h1 className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl">Care, connected.</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Doc&apos; O Clock is a healthcare technology platform built to make it simpler for people to find care, book visits, manage prescriptions and connect with trusted healthcare organisations.
          </p>
        </section>
        <img
          src="https://images.unsplash.com/photo-1666886573440-16ac24f89e31?auto=format&fit=crop&w=1000&q=85"
          alt="Healthcare professional and patient reviewing care together"
          className="h-64 w-full rounded-3xl object-cover shadow-xl shadow-primary/10"
        />
      </div>

      <section className="mt-16 grid gap-5 md:grid-cols-3">
        {[
          { icon: HeartPulse, title: "For patients", text: "Search for care, book appointments, prepare for visits, manage health information and access telehealth tools." },
          { icon: Stethoscope, title: "For care teams", text: "Support independent professionals with scheduling, patient workflows, telehealth, records and practice operations." },
          { icon: Building2, title: "For organisations", text: "Connect clinics, pharmacies, laboratories, diagnostic centres and hospitals through operational healthcare tools." },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <item.icon className="mb-4 h-7 w-7 text-primary" />
            <h2 className="mb-2 text-lg font-semibold">{item.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 rounded-3xl border border-primary/15 bg-primary/5 p-8 sm:p-10">
        <div className="flex gap-4">
          <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-primary" />
          <div>
            <h2 className="mb-3 text-2xl font-bold">Safety and responsibility</h2>
            <p className="max-w-3xl leading-relaxed text-muted-foreground">
              Doc&apos; O Clock provides the technology that enables care journeys. Healthcare professionals and institutions remain independently responsible for clinical judgement, treatment, professional conduct and their legal and regulatory duties. The Platform is not an emergency response service and does not replace direct medical care when it is required.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
              <Link to="/terms" className="text-primary hover:underline">Read our Terms and Conditions</Link>
              <Link to="/privacy" className="text-primary hover:underline">Read our Privacy Policy</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
);

export default About;
