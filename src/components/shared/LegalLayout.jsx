import Link from "next/link";

export const SUPPORT_EMAIL = "support@iskymd.com";
export const ADMIN_EMAIL = "admin@iskymd.com";
export const LEGAL_UPDATED = "September 22, 2026";

export function Mail({ address }) {
  return (
    <a href={`mailto:${address}`} className="font-bold text-[#1d46af] hover:underline">
      {address}
    </a>
  );
}

export function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-black tracking-tight text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-800">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <Link href="/solutions" className="text-sm font-bold text-[#1d46af] hover:underline">
            Back to Solutions
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-8 text-sm leading-6 text-slate-600">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Effective date: {LEGAL_UPDATED}
          </p>
          {children}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-6 text-xs font-bold text-[#1d46af]">
            <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms-of-use" className="hover:underline">Terms of Use</Link>
            <Link href="/refund-policy" className="hover:underline">Refund &amp; Cancellation Policy</Link>
            <Link href="/contact-us" className="hover:underline">Contact Us</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
