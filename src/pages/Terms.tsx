
import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms and Conditions | Doc&apos; O Clock</title>
        <meta 
          name="description" 
          content="Terms and conditions for using Doc' O Clock healthcare services" 
        />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6 flex gap-2 items-center">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-primary mb-6">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-6">Last updated: May 21, 2025</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Doc&apos; O Clock. These Terms and Conditions govern your use of our 
              healthcare service application including all features and functionalities, 
              website, user interfaces, and all content associated with our service.
            </p>
            <p>
              By using our application, you agree to these Terms. Please read them carefully.
              If you do not agree to these Terms of Service, please do not use our service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Use of Service</h2>
            <p className="mb-4">
              Doc&apos; O Clock provides a platform connecting users with healthcare providers. 
              We do not provide medical services directly. All medical services are provided 
              by independent healthcare professionals.
            </p>
            <p>
              You must be at least 18 years old to create an account. You may use the service on 
              behalf of minors or others only if you have legal authority to do so.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Account Responsibilities</h2>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account 
              information and password. You agree to notify us immediately of any unauthorized 
              use of your account.
            </p>
            <p>
              You are responsible for providing accurate and complete information when creating 
              an account and scheduling appointments. Inaccurate information may impact the 
              quality of services provided.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Healthcare Services</h2>
            <p className="mb-4">
              Doc&apos; O Clock facilitates connections with healthcare providers but does not 
              guarantee availability of specific providers or appointment times. All medical 
              advice, diagnoses, and treatments are the responsibility of the healthcare provider.
            </p>
            <p className="mb-4">
              This service is not intended for medical emergencies. If you are experiencing a 
              medical emergency, please call your local emergency services immediately.
            </p>
            <p>
              Doc&apos; O Clock is not a substitute for in-person medical care when such care 
              is necessary.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Payments and Cancellations</h2>
            <p className="mb-4">
              Payment terms are specified at the time of booking. You agree to pay all fees 
              associated with services booked through our platform.
            </p>
            <p>
              Cancellation policies vary by provider. Please review the specific cancellation 
              policy before booking. No-shows or late cancellations may result in charges as 
              specified in the provider's policy.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Privacy</h2>
            <p>
              Your use of Doc&apos; O Clock is also governed by our Privacy Policy, which can 
              be found <Link to="/privacy" className="text-primary hover:underline">here</Link>. 
              The Privacy Policy describes how we collect, use, and share information.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="mb-4">
              To the maximum extent permitted by law, Doc&apos; O Clock, its employees, and 
              affiliates will not be liable for any indirect, incidental, special, consequential, 
              or punitive damages arising out of or in connection with your use of our service.
            </p>
            <p>
              We do not control, and are not responsible for, the actions or content of any 
              healthcare provider or other third party. We make no warranties about the quality 
              of any healthcare service provided by providers found through our service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Modifications to Terms</h2>
            <p className="mb-4">
              We may modify these Terms at any time. We will post the most current version on 
              our website. If we make material changes, we will notify you through the service 
              or by other means.
            </p>
            <p>
              Your continued use of Doc&apos; O Clock after changes become effective constitutes 
              your acceptance of the changed Terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Termination</h2>
            <p>
              We may terminate or suspend your account and access to our service immediately, 
              without prior notice, if you violate these Terms or for any other reason at our 
              sole discretion.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the 
              jurisdiction in which Doc&apos; O Clock is registered, without giving effect to any 
              principles of conflicts of law.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at 
              <a href="mailto:legal@docOclock.com" className="text-primary hover:underline mx-1">
                legal@docOclock.com
              </a>
              or through our Contact Us page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
