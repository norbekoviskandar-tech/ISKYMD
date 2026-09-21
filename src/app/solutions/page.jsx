import Link from "next/link";

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-black text-[#1d46af] tracking-tight">Isky</span>
            <div className="relative ml-2 w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[2.5px] border-[#1d46af]" />
              <div className="absolute inset-[3px] rounded-full border border-amber-400 opacity-80" />
              <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[#1d46af] font-black text-[12px] tracking-tighter">MD</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Home</Link>
            <Link href="/products" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Products</Link>
            <Link href="/solutions" className="text-sm font-bold text-[#1d46af]">Solutions</Link>
            <Link href="/privacy-policy" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-use" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Terms of Use</Link>
            <Link href="/refund-policy" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Refund Policy</Link>
            <Link href="/contact-us" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Contact Us</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="mb-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1d46af]">Compliance Pages</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Solutions & Verification Information</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            IskyMD provides educational products for medical students, including question banks,
            performance tracking, and guided preparation workflows. This section contains
            policy and contact pages commonly required during payment gateway verification.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/privacy-policy" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#1d46af] transition-colors">
            <h2 className="text-lg font-black text-slate-900">Privacy Policy</h2>
            <p className="mt-2 text-sm text-slate-600">How user data is collected, used, secured, and retained.</p>
          </Link>

          <Link href="/terms-of-use" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#1d46af] transition-colors">
            <h2 className="text-lg font-black text-slate-900">Terms of Use</h2>
            <p className="mt-2 text-sm text-slate-600">Rules, account responsibilities, subscription usage, and limitations.</p>
          </Link>

          <Link href="/refund-policy" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#1d46af] transition-colors">
            <h2 className="text-lg font-black text-slate-900">Refund &amp; Cancellation</h2>
            <p className="mt-2 text-sm text-slate-600">14-day refund guarantee, how to request a refund, and how access periods work.</p>
          </Link>

          <Link href="/contact-us" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#1d46af] transition-colors">
            <h2 className="text-lg font-black text-slate-900">Contact Us</h2>
            <p className="mt-2 text-sm text-slate-600">Official support and compliance contact details for verification teams.</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
