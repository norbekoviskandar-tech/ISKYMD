import Link from "next/link";

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-800">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Contact Us</h1>
          <Link href="/solutions" className="text-sm font-bold text-[#1d46af] hover:underline">
            Back to Solutions
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-sm leading-6 text-slate-600 space-y-4">
          <p>
            For billing, legal, privacy, or payment-gateway verification inquiries, please contact our support team.
          </p>
          <div>
            <p><span className="font-bold text-slate-800">Support Email (billing, refunds, access):</span> support@iskymd.com</p>
            <p><span className="font-bold text-slate-800">Compliance Email:</span> admin@iskymd.com</p>
            <p><span className="font-bold text-slate-800">Business Name:</span> IskyMD Universal Systems</p>
            {/* TODO: add the registered business address and a contact phone number here (payment providers ask for them). */}
          </div>
          <p>
            Response time is typically within 1-2 business days.
          </p>
          <p>
            See also our{" "}
            <Link href="/refund-policy" className="font-bold text-[#1d46af] hover:underline">Refund &amp; Cancellation Policy</Link>,{" "}
            <Link href="/privacy-policy" className="font-bold text-[#1d46af] hover:underline">Privacy Policy</Link> and{" "}
            <Link href="/terms-of-use" className="font-bold text-[#1d46af] hover:underline">Terms of Use</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
