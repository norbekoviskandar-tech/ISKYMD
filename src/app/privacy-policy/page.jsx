import { LegalLayout, Section, Mail, ADMIN_EMAIL } from "@/components/shared/LegalLayout";

export const metadata = { title: "Privacy Policy | IskyMD" };

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <Section title="1. Who we are">
        <p>
          IskyMD Universal Systems (&ldquo;IskyMD&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates iskymd.com, an
          online education platform for medical students and clinicians. This policy explains what personal information
          we collect, how we use it, and the choices you have. Questions can be sent to <Mail address={ADMIN_EMAIL} />.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>
          <span className="font-bold text-slate-800">Account information:</span> your name, email address, and password.
          Passwords are stored only as salted hashes, never in readable form.
        </p>
        <p>
          <span className="font-bold text-slate-800">Purchase information:</span> the products you buy, order amounts,
          and access start and end dates. Card details are entered on our payment provider&rsquo;s secure payment page
          and are not received or stored by us.
        </p>
        <p>
          <span className="font-bold text-slate-800">Learning activity:</span> tests you create, answers, scores, marked
          questions, time spent, study planner entries, and the performance analytics generated from them.
        </p>
        <p>
          <span className="font-bold text-slate-800">Messages:</span> anything you send us through support or feedback
          forms.
        </p>
        <p>
          <span className="font-bold text-slate-800">Technical information:</span> IP address, browser and device
          information, and server logs, used for security, rate limiting, and diagnostics.
        </p>
      </Section>

      <Section title="3. How we use your information">
        <p>
          To create and secure your account; to deliver the products you purchase and manage your access period; to
          process orders and provide receipts; to show you your progress and performance; to respond to support requests;
          to prevent fraud, abuse, and unauthorized account sharing; to improve the platform; and to meet legal
          obligations. We do not sell your personal information and we do not use it for third-party advertising.
        </p>
      </Section>

      <Section title="4. Who we share it with">
        <p>
          We share information only with service providers that help us run the platform, under confidentiality and data
          protection obligations: our hosting provider (Vercel), our database and file storage provider (Supabase), and
          our payment provider (2Checkout, part of Verifone), which processes payments and screens for fraud and handles
          payment data under its own privacy notice. We may also disclose information where required by law or to protect
          our rights, users, or the platform, and as part of a business transfer such as a merger or sale, in which case
          we will tell you.
        </p>
      </Section>

      <Section title="5. Cookies and browser storage">
        <p>
          We use a strictly necessary session cookie to keep you signed in, and your browser&rsquo;s local storage to
          remember things like your cart, your selected product, and your in-progress test. We do not use advertising
          cookies or third-party analytics trackers. You can clear cookies and site data in your browser at any time;
          doing so will sign you out.
        </p>
      </Section>

      <Section title="6. Where your data is stored">
        <p>
          Our database is hosted in Seoul, South Korea, and our providers may process data in other countries where they
          operate. Where required, we rely on appropriate safeguards for international transfers.
        </p>
      </Section>

      <Section title="7. How long we keep it">
        <p>
          We keep your information while your account is active and for as long as needed to provide the service. When you
          ask us to delete your account we will delete or anonymize your personal data, except for records we must keep
          for legal, tax, accounting, or fraud-prevention purposes.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We protect data with HTTPS encryption in transit, salted password hashing, role-based access controls, and
          limited access to production systems. No online service can be guaranteed to be perfectly secure, so please use
          a strong, unique password and do not share it.
        </p>
      </Section>

      <Section title="9. Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, delete, or export your personal
          information, to object to or restrict certain processing, and to withdraw consent. To exercise these rights,
          email <Mail address={ADMIN_EMAIL} /> from your registered address. We will respond within 30 days. You may
          also complain to your local data protection authority.
        </p>
      </Section>

      <Section title="10. Children">
        <p>
          The platform is intended for adult learners and is not directed to children under 16. We do not knowingly
          collect their personal information; if you believe a child has given us data, contact us and we will delete it.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. The effective date at the top shows when it last changed, and we
          will notify account holders of material changes.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          IskyMD Universal Systems &mdash; <Mail address={ADMIN_EMAIL} />
        </p>
      </Section>
    </LegalLayout>
  );
}
