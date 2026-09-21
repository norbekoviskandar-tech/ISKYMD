"use client";

import { useContext } from "react";
import Link from "next/link";
import { AppContext } from "@/context/AppContext";
import CartDropdown from "@/components/student/layout/CartDropdown";
import {
  ArrowRight,
  ShoppingCart,
  User
} from "lucide-react";

export default function Home() {
  const { cart, isCartOpen, setIsCartOpen } = useContext(AppContext);

  return (
    <div className="flex min-h-screen flex-col bg-[#fcfdfe]">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="flex items-center">
              <span className="text-2xl font-black text-[#1d46af] tracking-tight">Isky</span>
              <div className="relative ml-2 w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2.5px] border-[#1d46af]"></div>
                <div className="absolute inset-[3px] rounded-full border border-amber-400 opacity-80"></div>
                <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                <span className="text-[#1d46af] font-black text-[12px] tracking-tighter">MD</span>
              </div>
            </div>
          </div>
          
          <div className="hidden items-center gap-10 md:flex">
            <Link href="/products" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Products</Link>
            <Link href="/solutions" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Solutions</Link>
            <div className="relative">
              <button 
                onClick={() => setIsCartOpen(!isCartOpen)} 
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors relative"
              >
                <div className="relative">
                  <ShoppingCart size={18} />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1d46af] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {cart.length}
                    </span>
                  )}
                </div>
                Cart
              </button>
              <CartDropdown />
            </div>
            <div className="flex items-center">
              <Link href="/auth" className="group flex items-center justify-center rounded-full bg-blue-50 w-11 h-11 text-[#1d46af] shadow-lg shadow-blue-500/5 hover:bg-blue-100 transition-all active:scale-95 border-2 border-[#1d46af]/30 hover:border-[#1d46af]/50">
                <User size={18} className="transition-transform group-hover:scale-110" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-48 pb-24 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -z-10 h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-blue-50/50 blur-3xl opacity-60" />
          
          <div className="mx-auto max-w-6xl text-center">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white border border-slate-100 px-5 py-2 text-xs font-black uppercase tracking-widest text-[#1d46af] shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="flex h-2 w-2 rounded-full bg-[#1d46af]" />
              Leading Medical Education Platform
            </div>

            <h1 className="mb-8 text-6xl font-[1000] text-slate-900 tracking-tighter leading-[1.05] sm:text-8xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Transform Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1d46af] to-[#3b82f6]">Clinical Journey.</span>
            </h1>

            <p className="mx-auto mb-12 max-w-2xl text-lg text-slate-500 font-medium leading-relaxed sm:text-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              The professional-grade suite for medical clinical mastery. High-yield content, rigorous accuracy, and elite performance.
            </p>

            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link href="/products" className="w-full sm:w-auto h-16 flex items-center justify-center gap-3 rounded-2xl bg-[#1d46af] px-10 text-lg font-black text-white shadow-2xl shadow-blue-500/30 hover:bg-[#16368a] transition-all hover:-translate-y-1 active:scale-95 group">
                Explore Products
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b border-slate-100 pb-16 mb-10">
             <div>
                <div className="flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
                  <span className="text-2xl font-black text-[#1d46af] tracking-tight">Isky</span>
                  <div className="relative ml-2 w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[2.5px] border-[#1d46af]"></div>
                    <div className="absolute inset-[3px] rounded-full border border-amber-400 opacity-80"></div>
                    <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <span className="text-[#1d46af] font-black text-[12px] tracking-tighter">MD</span>
                  </div>
                </div>
                <p className="mt-4 text-slate-500 text-sm max-w-xs font-medium leading-relaxed">
                   The precision standard in clinical question systems. Engineered for students who demand excellence.
                </p>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                <div className="flex flex-col gap-4">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product</span>
                   <a href="#" className="text-sm font-bold text-slate-700 hover:text-[#1d46af] transition-colors">Clinical QBank</a>
                   <a href="#" className="text-sm font-bold text-slate-700 hover:text-[#1d46af] transition-colors">Pricing</a>
                   <Link href="/products" className="text-sm font-bold text-slate-700 hover:text-[#1d46af] transition-colors">Features</Link>
                </div>
                <div className="flex flex-col gap-4">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Support</span>
                   <a href="#" className="text-sm font-bold text-slate-700 hover:text-[#1d46af] transition-colors">Contact</a>
                   <a href="#" className="text-sm font-bold text-slate-700 hover:text-[#1d46af] transition-colors">Knowledge Base</a>
                   <a href="#" className="text-sm font-bold text-slate-700 hover:text-[#1d46af] transition-colors">Offline Guide</a>
                </div>
             </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
               © 2026 IskyMD Universal Systems. All rights reserved.
             </span>
             <div className="flex gap-8">
                <Link href="/privacy-policy" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Privacy</Link>
                <Link href="/terms-of-use" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Terms</Link>
                <Link href="/refund-policy" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Refunds</Link>
                <Link href="/contact-us" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Contact</Link>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
