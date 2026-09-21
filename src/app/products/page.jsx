"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppContext } from "@/context/AppContext";
import CartDropdown from "@/components/student/layout/CartDropdown";
import { 
  ChevronRight, 
  Zap, 
  ShieldCheck, 
  Activity,
  CreditCard,
  UserPlus,
  ShoppingCart,
  User
} from "lucide-react";
import { getPublishedProducts } from "@/services/product.service";

export default function ProductsPage() {
  const router = useRouter();
  const { addToCart, cart, isCartOpen, setIsCartOpen, clearCart } = useContext(AppContext);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem("medbank_user");
    setIsLoggedIn(!!userId);
    loadProducts();
  }, []);

  // Helper function to generate dynamic description based on duration
  const generateDynamicDescription = (product) => {
    // If product has a custom description, use it
    if (product.description && product.description.trim()) {
      return product.description;
    }

    // Otherwise, generate dynamic description based on duration_days
    const days = product.duration_days;
    if (days <= 90) {
      return `Master the art of ECG interpretation with ${days}-day access to high-fidelity rhythm strips and real-time wave analysis.`;
    } else if (days <= 180) {
      return `Extended ${days}-day access for deep clinical mastery. Includes all premium modules, case studies, and advanced metrics.`;
    } else {
      return `Full ${days}-day access to precision medical training. The ultimate choice for residents and specialists seeking excellence.`;
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getPublishedProducts();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
        // No products in DB – show empty state
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = (p) => {
    // For now, Buy Now works via adding to cart and redirecting
    addToCart({
      id: p.id,
      title: p.name,
      price: p.price,
      duration: p.duration_days,
      color: "bg-rose-500"
    });

    if (!isLoggedIn) {
      setShowAuthModal(true);
    } else {
      router.push("/checkout");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fcfdfe]">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
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
             <Link href="/" className="text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors">Home</Link>
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
              {isLoggedIn ? (
                <button 
                  onClick={() => router.push('/student/portal')}
                  className="rounded-full bg-[#1d46af] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#16368a] transition-all active:scale-95"
                >
                  My Portal
                </button>
              ) : (
                  <Link href="/auth" className="group flex items-center justify-center rounded-full bg-blue-50 w-11 h-11 text-[#1d46af] shadow-lg shadow-blue-500/5 hover:bg-blue-100 transition-all active:scale-95 border-2 border-[#1d46af]/30 hover:border-[#1d46af]/50">
                    <User size={18} className="transition-transform group-hover:scale-110" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-50 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 font-bold">
          ✓ {toastMessage}
        </div>
      )}

      <main className="flex-1 pt-32 pb-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <h1 className="text-5xl font-[1000] text-slate-900 tracking-tighter mb-4">Precision Mastery.</h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
              Unlock the next generation of medical training. Our ECG Qbank is engineered for clinical excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl animate-pulse">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl mb-6" />
                  <div className="h-6 bg-slate-100 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-slate-100 rounded w-full mb-8" />
                  <div className="h-10 bg-slate-100 rounded-xl w-full" />
                </div>
              ))
            ) : products.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/products/${p.id}`)}
                className="group bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col cursor-pointer relative overflow-hidden active:scale-[0.98]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="text-[#1d46af]" size={24} />
                </div>

                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500 shadow-lg shadow-rose-500/20 text-white transition-transform group-hover:scale-110 duration-500">
                  <Activity size={24} />
                </div>

                <h3 className="mb-2 text-2xl font-black text-slate-900 tracking-tight group-hover:text-[#1d46af] transition-colors">{p.name}</h3>
                <p className="mb-6 text-slate-500 font-medium text-sm leading-relaxed flex-grow">
                  {generateDynamicDescription(p)}
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                      <ShieldCheck size={12} strokeWidth={3} />
                    </div>
                    {p.plans?.length > 0 ? `${p.plans.length + 1} Subscription Options` : `Full access for ${p.duration_days} days`}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                      <Zap size={12} strokeWidth={3} />
                    </div>
                    High-Fidelity Practice Questions
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">From ${p.price} USD</span>
                      <span className="text-xs font-bold text-slate-400">/ one-time</span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/products/${p.id}`);
                    }}
                    className="w-full py-4 bg-[#1d46af] text-white text-sm font-black rounded-2xl hover:bg-[#16368a] transition-all active:scale-95 flex items-center justify-center gap-3 mb-3 shadow-lg shadow-blue-500/20"
                  >
                    <CreditCard size={18} />
                    VIEW OPTIONS
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart({
                        id: p.id,
                        title: p.name,
                        price: p.price,
                        duration: p.duration_days,
                        color: "bg-rose-500"
                      });
                      setToastMessage(`Added Base Plan: ${p.name}`);
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                    }}
                    className="w-full py-3 bg-white text-slate-400 border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={14} />
                    Quick Add Base
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 mx-auto border border-blue-100 text-[#1d46af]">
              <UserPlus size={32} />
            </div>
            <h3 className="text-2xl font-[1000] text-slate-900 mb-2 tracking-tight">Create an Account</h3>
            <p className="text-slate-500 font-medium mb-8">
              To purchase the ECG Qbank and track your progress, you first need to create your medical profile.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => router.push('/auth?redirect=/checkout')}
                className="w-full py-4 bg-[#1d46af]/10 text-[#1d46af] border-2 border-[#1d46af]/30 text-sm font-black rounded-xl hover:bg-[#1d46af]/20 transition-all active:scale-95"
              >
                SIGN UP NOW
              </button>
              <button 
                onClick={() => router.push('/auth?redirect=/checkout')}
                className="w-full py-4 bg-white text-slate-400 border-2 border-slate-100 text-sm font-black rounded-xl hover:bg-slate-50 transition-all active:scale-95"
              >
                ALREADY HAVE AN ACCOUNT?
              </button>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-20 px-6">
        <div className="mx-auto max-w-7xl text-center">
           <div className="inline-flex items-center mb-8">
              <span className="text-2xl font-black text-[#1d46af] tracking-tight">Isky</span>
              <div className="relative ml-2 w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2.5px] border-[#1d46af]"></div>
                <div className="absolute inset-[3px] rounded-full border border-amber-400 opacity-80"></div>
                <span className="text-[#1d46af] font-black text-[12px] tracking-tighter">MD</span>
              </div>
           </div>
           <p className="text-slate-400 text-sm font-medium mb-10">© 2026 IskyMD Universal Systems. All rights reserved.</p>
           <div className="flex justify-center gap-8">
              <a href="#" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Privacy</a>
              <a href="#" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Terms</a>
           </div>
        </div>
      </footer>
    </div>
  );
}

