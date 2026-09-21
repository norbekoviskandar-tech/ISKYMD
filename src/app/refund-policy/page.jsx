import { LegalLayout, Section, Mail, SUPPORT_EMAIL } from "@/components/shared/LegalLayout";

export const metadata = { title: "Refund & Cancellation Policy | IskyMD" };

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy">
      <Section title="1. What you are buying">
        <p>
          IskyMD sells time-limited digital access to online medical education products (question banks, performance
          tracking, and study tools). Nothing is shipped. Access is delivered electronically to your IskyMD account.
        </p>
      </Section>

      <Section title="2. 14-day refund guarantee">
        <p>
          If you are not satisfied with your purchase, you may request a full refund within 14 days of the purchase
          date. No lengthy explanation is required, although telling us why helps us improve.
        </p>
        <p>
          Refunds requested after 14 days are not automatic and are considered at our discretion, for example where a
          technical problem prevented you from using the product and we were unable to resolve it. Nothing in this
          policy limits any rights you have under the consumer protection laws that apply where you live.
        </p>
      </Section>

      <Section title="3. How to request a refund">
        <p>
          Email <Mail address={SUPPORT_EMAIL} /> from the address registered on your IskyMD account and include your
          order number or receipt and, if you wish, the reason for your request. We aim to reply within 1-2 business
          days. Orders are processed by our payment provider, 2Checkout (Verifone); if you prefer, you can also contact
          them about your order using the details on your receipt.
        </p>
      </Section>

      <Section title="4. How refunds are paid">
        <p>
          Approved refunds are returned to the original payment method. The time it takes for the money to appear
          depends on your bank or card issuer. When a refund is issued, access to the refunded product ends.
        </p>
      </Section>

      <Section title="5. Cancellation and renewal">
        <p>
          Each purchase gives access for a fixed period stated at checkout. Purchases do not renew
          automatically and you will not be charged again unless you choose to buy again, so there is nothing to
          cancel. To close your account or delete your data, contact us using the details below.
        </p>
      </Section>

      <Section title="6. Problems with access">
        <p>
          If you cannot access something you paid for, contact <Mail address={SUPPORT_EMAIL} /> first. We will fix the
          problem, extend your access, or refund you, as appropriate. Contacting us before opening a dispute with your
          bank lets us resolve most issues faster.
        </p>
      </Section>
    </LegalLayout>
  );
}
