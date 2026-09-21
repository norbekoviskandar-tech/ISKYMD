import Link from "next/link";
import { LegalLayout, Section, Mail, ADMIN_EMAIL, SUPPORT_EMAIL } from "@/components/shared/LegalLayout";

export const metadata = { title: "Terms of Use | IskyMD" };

export default function TermsOfUsePage() {
  return (
    <LegalLayout title="Terms of Use">
      <Section title="1. Acceptance of these terms">
        <p>
          By creating an account, purchasing, or using iskymd.com (the &ldquo;Service&rdquo;), you agree to these terms,
          our{" "}
          <Link href="/privacy-policy" className="font-bold text-[#1d46af] hover:underline">Privacy Policy</Link> and our{" "}
          <Link href="/refund-policy" className="font-bold text-[#1d46af] hover:underline">Refund &amp; Cancellation Policy</Link>.
          If you do not agree, please do not use the Service. You must be legally able to enter into a contract.
        </p>
      </Section>

      <Section title="2. The Service">
        <p>
          IskyMD provides online question banks, practice tests, performance tracking, and study tools for medical
          education. Features and content may change over time.
        </p>
      </Section>

      <Section title="3. Educational use only">
        <p>
          Content is provided for education and exam preparation only. It is not medical advice and must not be used to
          diagnose or treat any patient or condition. We do not guarantee any particular exam result.
        </p>
      </Section>

      <Section title="4. Your account">
        <p>
          Provide accurate information and keep your credentials secure. Each account is for one person and must not be
          shared. You are responsible for activity under your account; tell us promptly if you suspect unauthorized use.
        </p>
      </Section>

      <Section title="5. Prices and payment">
        <p>
          Prices are shown in US dollars (USD) on the product and checkout pages before you pay. Payments are processed by
          our payment provider, 2Checkout (Verifone). Applicable taxes, if any, are shown at checkout. We do not receive or
          store your full card details.
        </p>
      </Section>

      <Section title="6. Delivery and access">
        <p>
          All products are digital. After your payment is confirmed, access is activated on your account and is available
          immediately online; no physical goods are shipped. Access lasts for the period stated at checkout, starting from
          activation, and does not renew automatically. Subscriptions are limited to the purchased duration and the
          account they are assigned to.
        </p>
      </Section>

      <Section title="7. Refunds and cancellations">
        <p>
          Our 14-day refund guarantee and how to request a refund are described in the{" "}
          <Link href="/refund-policy" className="font-bold text-[#1d46af] hover:underline">Refund &amp; Cancellation Policy</Link>.
        </p>
      </Section>

      <Section title="8. Acceptable use">
        <p>
          Use the Service only for lawful educational purposes. You must not share your account, copy, scrape, or
          redistribute content, interfere with the Service, or attempt to gain unauthorized access. We may suspend or
          terminate access for abuse, unauthorized sharing, fraud, or violations of these terms.
        </p>
      </Section>

      <Section title="9. Intellectual property">
        <p>
          Platform content, question materials, and interface elements are protected intellectual property owned by
          IskyMD or its licensors. You receive a personal, non-transferable license to use them for your own study during
          your access period, and may not copy, redistribute, or sell them without written permission.
        </p>
      </Section>

      <Section title="10. Disclaimers and limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent permitted by
          law, IskyMD is not liable for indirect or consequential losses, and our total liability for any claim relating
          to the Service is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms
          limits liability that cannot be limited by law or your statutory consumer rights.
        </p>
      </Section>

      <Section title="11. Changes to these terms">
        <p>
          We may update these terms periodically. The effective date above shows the latest version, and continued use of
          the Service after an update means you accept the revised terms.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Support, billing, and refunds: <Mail address={SUPPORT_EMAIL} />. Legal and compliance: <Mail address={ADMIN_EMAIL} />.
        </p>
      </Section>
    </LegalLayout>
  );
}
