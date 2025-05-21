
import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy | Doc&apos; O Clock</title>
        <meta 
          name="description" 
          content="Privacy policy for Doc' O Clock healthcare services" 
        />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6 flex gap-2 items-center">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-primary mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: May 21, 2025</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              At Doc&apos; O Clock, we take your privacy seriously. This Privacy Policy explains how 
              we collect, use, disclose, and safeguard your information when you use our healthcare 
              service application, website, and related services.
            </p>
            <p>
              Please read this policy carefully. If you do not agree with the terms of this Privacy Policy, 
              please do not access or use our services.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">2.1 Personal Information</h3>
            <p className="mb-4">
              We may collect personal information that you voluntarily provide when using our service, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Contact information (name, email address, phone number)</li>
              <li>Demographic information (date of birth, gender)</li>
              <li>Health information (medical history, symptoms, diagnoses)</li>
              <li>Insurance information</li>
              <li>Payment details</li>
              <li>Authentication information (usernames, passwords)</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">2.2 Automatically Collected Information</h3>
            <p className="mb-4">
              When you access our services, we may automatically collect certain information about your device, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Device information (type, operating system, unique device identifiers)</li>
              <li>IP address and location data</li>
              <li>Browser type and settings</li>
              <li>Usage data (time spent on services, features used)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect for various purposes, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Facilitating appointment scheduling with healthcare providers</li>
              <li>Processing payments</li>
              <li>Providing customer support</li>
              <li>Improving our services</li>
              <li>Communicating with you about appointments, services, and updates</li>
              <li>Analyzing usage patterns to enhance user experience</li>
              <li>Complying with legal obligations</li>
              <li>Protecting against fraud and unauthorized transactions</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Sharing Your Information</h2>
            <p className="mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <span className="font-medium">Healthcare Providers:</span> Your information is shared with healthcare providers 
                you connect with through our service to facilitate medical consultations.
              </li>
              <li>
                <span className="font-medium">Service Providers:</span> Third parties that help us operate our service 
                (payment processors, cloud services, analytics providers).
              </li>
              <li>
                <span className="font-medium">Legal Requirements:</span> When required by applicable law, regulation, 
                legal process, or governmental request.
              </li>
              <li>
                <span className="font-medium">Business Transfers:</span> In connection with a merger, acquisition, or 
                sale of all or a portion of our assets.
              </li>
            </ul>
            <p>
              We will not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your 
              personal information. However, no method of transmission or storage is 100% secure, 
              and we cannot guarantee absolute security.
            </p>
            <p>
              Your health information is protected in accordance with applicable healthcare 
              privacy laws and regulations.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Your Rights and Choices</h2>
            <p className="mb-4">Depending on your location, you may have rights regarding your personal information, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Accessing your personal information</li>
              <li>Correcting inaccurate information</li>
              <li>Deleting your personal information</li>
              <li>Restricting or objecting to certain processing activities</li>
              <li>Data portability</li>
              <li>Withdrawing consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us using the information provided in the 
              "Contact Us" section below.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Children's Privacy</h2>
            <p>
              Our service is not directed to children under the age of 18. We do not knowingly collect 
              personal information from children. If you are a parent or guardian and believe your child 
              has provided us with personal information, please contact us, and we will take steps to 
              delete such information.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to, stored, and processed in countries outside of your 
              country of residence. We ensure that such transfers comply with applicable data protection laws 
              and that your information remains protected according to this Privacy Policy.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last Updated" date. You are 
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
            <p className="mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data 
              practices, please contact us at:
            </p>
            <div className="mb-4">
              <p>Doc&apos; O Clock Privacy Team</p>
              <p>
                Email: <a href="mailto:privacy@docOclock.com" className="text-primary hover:underline">
                  privacy@docOclock.com
                </a>
              </p>
              <p>Address: 123 Healthcare Avenue, Medical District, ZM 10001</p>
            </div>
            <p>
              We will respond to your inquiry within 30 days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
