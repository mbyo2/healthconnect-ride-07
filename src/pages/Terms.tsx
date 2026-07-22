import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Terms and Conditions | Doc&apos; O Clock</title>
      <meta name="description" content="The terms governing use of the Doc' O Clock healthcare platform." />
    </Helmet>

    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Link to="/">
        <Button variant="ghost" className="mb-6 flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Home
        </Button>
      </Link>

      <h1 className="mb-3 text-3xl font-bold text-primary">Terms and Conditions</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: July 22, 2026</p>

      <div className="space-y-8 text-foreground">
        <section>
          <h2 className="mb-4 text-xl font-semibold">1. Acceptance and platform role</h2>
          <p className="mb-4">
            These Terms govern your access to Doc&apos; O Clock&apos;s website, mobile and web applications, telehealth tools, appointment, pharmacy, institution, payment, communication and related services (the &ldquo;Platform&rdquo;). By creating an account, clicking to accept these Terms, or using the Platform, you agree to them.
          </p>
          <p>
            Doc&apos; O Clock provides technology that helps patients, independent practitioners, pharmacies, laboratories and healthcare institutions connect and manage permitted workflows. Unless Doc&apos; O Clock expressly identifies itself as the provider of a particular service, it is not the provider of clinical care, a medical facility, pharmacy, insurer, emergency service or employer of the healthcare professionals available through the Platform.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">2. No medical advice or emergency service</h2>
          <p className="mb-4">
            Information shown through the Platform, including search results, reminders, health content, symptom prompts, automated suggestions and AI-assisted features, is for general information and workflow support. It is not medical advice, a diagnosis, a prescription, a treatment plan or a substitute for an in-person assessment where one is clinically required.
          </p>
          <p>
            Do not use the Platform as an emergency response service or rely on it for urgent intervention, ambulance dispatch, crisis support, or life-saving communication. In an emergency, contact local emergency services or attend the nearest appropriate emergency facility immediately.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">3. Independent providers and institutions</h2>
          <p className="mb-4">
            Healthcare professionals, pharmacies and institutions using the Platform act independently. They alone are responsible for their registrations, licences, insurance, professional conduct, clinical judgement, treatment, prescriptions, dispensing, records, fees, staff, facilities, service availability and compliance with laws and professional standards that apply to them.
          </p>
          <p>
            Doc&apos; O Clock may collect information, conduct operational checks, display badges, moderate content or suspend access. These steps do not guarantee a provider&apos;s identity, qualification, licence status, safety, availability, treatment outcome or suitability. Patients must make their own informed decisions and may verify a provider&apos;s credentials with the relevant regulator.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">4. Accounts, authority and security</h2>
          <p className="mb-4">
            You must provide accurate, current information; keep your credentials confidential; and promptly report suspected unauthorised access. You are responsible for activity under your account to the extent permitted by law. You may act for a child, patient, business or other person only when you have the required authority and have obtained all necessary permissions.
          </p>
          <p>
            You must not share accounts, bypass access controls, scrape the Platform, test its security without written permission, introduce malware, impersonate another person or organisation, or use the Platform in a way that is unlawful, unsafe, fraudulent, discriminatory, abusive or harmful to another person&apos;s privacy.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">5. Content, records and communications</h2>
          <p className="mb-4">
            You remain responsible for information, records, documents, messages, listings, reviews and other content you submit or make available. You confirm that it is accurate, lawful, non-infringing and shared with the required authority or consent. You grant Doc&apos; O Clock a non-exclusive, worldwide, royalty-free licence to host, process, reproduce and transmit that content only as needed to operate, secure, improve and provide the Platform and comply with law.
          </p>
          <p>
            Do not upload another person&apos;s health, identity, payment or confidential information unless you are authorised to do so. Doc&apos; O Clock may remove or restrict content, preserve records, or disclose information where reasonably necessary for safety, fraud prevention, enforcement, legal compliance or the protection of rights.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">6. Privacy and health information</h2>
          <p>
            Our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> explains how the Platform handles personal information. Health information is sensitive personal data. Users and organisations must only collect, access, share and retain it when authorised and for a legitimate care, operational or legal purpose. Each independent provider or institution is responsible for its own privacy, recordkeeping and professional confidentiality duties. Nothing in these Terms limits rights that cannot be limited under applicable data-protection or healthcare law.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">7. Bookings, payments and third parties</h2>
          <p className="mb-4">
            Booking availability, pricing, cancellation terms, refunds, insurance decisions, prescriptions, delivery and fulfilment are determined by the relevant provider, institution, pharmacy, insurer or payment processor unless we state otherwise. You must review applicable terms before confirming a transaction.
          </p>
          <p>
            The Platform may integrate third-party software, payment services, communication networks, maps, devices and connectivity. Those services may have their own terms and outages. Doc&apos; O Clock is not responsible for third-party acts, omissions, security, availability, network failures or content except where liability cannot lawfully be excluded.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">8. Service availability and changes</h2>
          <p>
            We may maintain, modify, suspend or discontinue any part of the Platform, including for security, safety, legal, operational or product reasons. We do not guarantee uninterrupted, error-free, secure or universally available service, and you should not rely on the Platform as your sole copy of important health, business or clinical information.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">9. Intellectual property</h2>
          <p>
            The Platform, its software, branding, designs, workflows, content and documentation are owned by or licensed to Doc&apos; O Clock and are protected by applicable laws. Subject to these Terms, we grant you a limited, revocable, non-transferable right to use the Platform for its intended purpose. You may not copy, modify, reverse engineer, sell, license or exploit the Platform except with our prior written permission or where applicable law expressly permits it.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">10. Disclaimers and limitation of liability</h2>
          <p className="mb-4">
            To the fullest extent permitted by law, the Platform is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; Doc&apos; O Clock disclaims warranties not expressly stated in these Terms, including warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, availability, clinical quality, provider suitability and outcome.
          </p>
          <p>
            To the fullest extent permitted by law, Doc&apos; O Clock and its owners, operators, directors, officers, employees, contractors, developers, affiliates, licensors and service providers will not be liable for indirect, incidental, special, consequential, exemplary or punitive loss; loss of data, revenue, goodwill or opportunity; or losses arising from clinical care, provider conduct, patient conduct, third-party services, internet or device failures, unauthorised access, or reliance on Platform content. Nothing in these Terms excludes liability that cannot lawfully be excluded or limited.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">11. Indemnity</h2>
          <p>
            To the fullest extent permitted by law, you will defend, indemnify and hold harmless Doc&apos; O Clock and its owners, operators, directors, officers, employees, contractors, developers, affiliates, licensors and service providers from claims, losses, liabilities, damages, costs and expenses (including reasonable legal fees) arising from your content, your use or misuse of the Platform, your breach of these Terms, your violation of another person&apos;s rights, or—if you are a provider or institution—your clinical, professional, employment, licensing, pharmacy, facility or regulatory obligations. This does not apply to the extent a claim is caused by our wilful misconduct or liability that cannot be excluded by law.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">12. Suspension and termination</h2>
          <p>
            We may suspend, restrict or terminate access, remove content, cancel unconfirmed transactions or report conduct to the appropriate authority where we reasonably believe it is necessary for safety, security, fraud prevention, legal compliance, protection of rights, or enforcement of these Terms. You may stop using the Platform at any time, subject to outstanding obligations. Provisions that should reasonably survive termination, including privacy, intellectual property, disclaimers, liability limits and indemnity, will survive.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-xl font-semibold">13. Governing law, changes and contact</h2>
          <p className="mb-4">
            These Terms are governed by the laws of the Republic of Zambia, subject to mandatory laws that apply to you. If any provision is unenforceable, the remaining provisions continue in effect. We may update these Terms by posting the revised version and updating the date above; continued use after the effective date means acceptance where permitted by law.
          </p>
          <p>
            Questions, notices or reports may be sent through our <Link to="/contact" className="text-primary hover:underline">Contact page</Link>. You should obtain independent legal advice before relying on these Terms for a particular business, clinical, employment, privacy or regulatory situation.
          </p>
        </section>
      </div>
    </main>
  </div>
);

export default Terms;
