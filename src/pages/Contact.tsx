import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Mail, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SUPPORT_EMAIL = "support@doc0clock.online";
const EMERGENCY_NUMBER = import.meta.env.VITE_EMERGENCY_NUMBER || "991";

const Contact = () => {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please add your name, email, and message so we can respond.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSending(true);
    // Public launch: open the visitor's mail client with a pre-filled message.
    // This keeps Contact usable from day one with no backend dependency.
    const subject = encodeURIComponent(
      form.subject.trim() || `Support request from ${form.firstName} ${form.lastName}`.trim()
    );
    const body = encodeURIComponent(
      `Name: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSending(false);
    setSent(true);
    toast.success("Opening your email app — we'll respond within 1 business day.");
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Doc' O Clock Zambia</title>
        <meta
          name="description"
          content="Contact Doc' O Clock support in Lusaka, Zambia. Help with bookings, video consultations, prescriptions, pharmacy orders, and NHIMA."
        />
        <link rel="canonical" href="https://doc0clock.online/contact" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground">
              We&apos;re here to help. Get in touch with our support team in Lusaka.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we&apos;ll get back to you within 1 business day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sent ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                    <p className="font-semibold">Thanks — your message is on its way.</p>
                    <p className="text-sm text-muted-foreground">
                      If your email app didn&apos;t open, write to us directly at {SUPPORT_EMAIL}.
                    </p>
                    <Button variant="outline" onClick={() => setSent(false)}>
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="Enter your first name"
                          value={form.firstName}
                          onChange={update("firstName")}
                          autoComplete="given-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Enter your last name"
                          value={form.lastName}
                          onChange={update("lastName")}
                          autoComplete="family-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={update("email")}
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="What is this regarding?"
                        value={form.subject}
                        onChange={update("subject")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us how we can help you..."
                        rows={4}
                        value={form.message}
                        onChange={update("message")}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={sending}>
                      {sending ? "Preparing..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{SUPPORT_EMAIL}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">
                        Lusaka, Zambia
                        <br />
                        Serving all 10 provinces
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Support Hours</p>
                      <p className="text-muted-foreground">
                        Monday - Friday: 8:00 AM - 6:00 PM CAT
                        <br />
                        Saturday: 9:00 AM - 2:00 PM CAT
                        <br />
                        Sunday: Closed (emergency line stays open)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Assistance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    If you&apos;re experiencing a medical emergency, please call {EMERGENCY_NUMBER} immediately.
                  </p>
                  <p className="text-muted-foreground">
                    For urgent but non-emergency concerns, contact your healthcare provider
                    directly or visit your nearest clinic.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
