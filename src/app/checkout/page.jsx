"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppContext } from "@/context/AppContext";
import { 
  CreditCard, 
  ShieldCheck, 
  ChevronRight, 
  Activity,
  ArrowRight,
  Lock,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { getUserById, updateUser, renewUserSubscription } from "@/services/user.service";

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { cart, setCart } = useContext(AppContext);

  useEffect(() => {
    const userId = localStorage.getItem("medbank_user");
    if (!userId) {
      router.push("/auth?redirect=/checkout");
      return;
    }

    getUserById(userId).then(userData => {
      if (userData) {
        setUser(userData);
      }
      setLoading(false);
    });
  }, [router]);

  const handlePurchase = async () => {
    if (!user) return;
    setIsProcessing(true);
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Simulate payment gateway response
      const paymentResponse = { token: 'tok_' + Math.random().toString(36).substr(2, 9) };

      // Loop through cart items and create subscriptions for each
      for (const item of cart) {
        // 1. Before calling /api/users/subscriptions, check if item.id exists and user.id exists.
        if (!item.id || !user.id) {
          throw new Error("Product ID or User ID is missing");
        }

        const res = await fetch('/api/users/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            productId: item.id,
            // 2. Ensure durationDays is a number
            durationDays: Number(item.duration || 90),
            // 3. Include paymentToken from payment processor
            paymentToken: paymentResponse.token,
            amount: item.price || 0,
            startDate: new Date().toISOString()
          })
        });

        const data = await res.json();
        // 4. Wrap POST request in try/catch and log full response
        if (!res.ok) {
          throw new Error(data.message || data.error || "Unknown API error");
        }
      }

      // 5. Only after successful API response, clear cart and show success message.
      setCart([]);
      localStorage.removeItem("medbank_cart");

      // Update local user state from server
      const freshUser = await getUserById(user.id);
      setUser(freshUser);
      setIsSuccess(true);
      
      setTimeout(() => {
        router.push("/student/portal");
      }, 2000);
    } catch (err) {
      console.error("Subscription creation failed:", err);
      setError("Subscription creation failed. Please contact support.");
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <RefreshCw size={24} className="animate-spin text-[#1d46af]" />
      </div>
    );
  }

  const subtotal = cart.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col">
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex items-center">
              <span className="text-2xl font-black text-[#1d46af] tracking-tight">Isky</span>
              <div className="relative ml-2 w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2.5px] border-[#1d46af]"></div>
                <div className="absolute inset-[3px] rounded-full border border-amber-400 opacity-80"></div>
                <span className="text-[#1d46af] font-black text-[12px] tracking-tighter">MD</span>
              </div>
            </div>
          </div>
          <div className="text-sm font-bold text-slate-400">Secure Checkout</div>
        </div>
      </nav>

      <main className="flex-1 pt-32 pb-24 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Side: Product Info */}
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-8">Review Order</h1>
            
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-blue-500/5 mb-8">
              <div className="space-y-6 mb-6 max-h-[400px] overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
                      <Activity size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-slate-900 leading-tight truncate">{item.title}</h3>
                      <p className="text-sm font-bold text-slate-400">
                        {item.duration || 90}-Day Access {(item.quantity || 1) > 1 && `(x${item.quantity})`}
                      </p>
                    </div>
                    <div className="text-xl font-black text-slate-900 absolute right-8 sm:static">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(0)} USD
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t border-slate-50 pt-6">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-900">${subtotal.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-400">Tax</span>
                  <span className="text-slate-900">$0.00</span>
                </div>
                <div className="flex justify-between text-2xl font-black pt-4 border-t border-slate-50">
                  <span className="text-slate-900">Total</span>
                  <span className="text-[#1d46af]">${subtotal.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <ShieldCheck size={18} className="text-emerald-500" />
              <p className="text-xs font-bold uppercase tracking-widest">Bank-Level Security Guaranteed</p>
            </div>
          </div>

          {/* Right Side: Payment Form (Placeholder) */}
          <div className="relative">
            {isSuccess ? (
              <div className="h-full bg-white rounded-[3rem] p-12 border-2 border-emerald-100 shadow-2xl flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle2 size={48} />
                </div>
                 <h2 className="text-3xl font-[1000] text-slate-900 mb-2">
                  {user.purchased && user.activatedByPurchase ? "Subscription Renewed" : "Payment Confirmed"}
                </h2>
                <p className="text-slate-500 font-medium mb-8">
                  {user.purchased && user.activatedByPurchase 
                    ? "Your access has been extended. Redirecting you now..."
                    : "Your medical training assets have been added to your portal. Redirecting you now..."}
                </p>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 animate-progress origin-left"></div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl">
                <div className="flex items-center gap-2 mb-8">
                  <Lock size={16} className="text-slate-300" />
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Payment Detail</h2>
                </div>

                <div className="space-y-6">
                  {/* Mock Credit Card Form */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        disabled 
                        placeholder="•••• •••• •••• 4242" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry</label>
                      <input 
                        disabled 
                        placeholder="MM/YY" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVC</label>
                      <input 
                        disabled 
                        placeholder="•••" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-400"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                      <p className="text-xs font-bold text-red-600 leading-relaxed text-center">
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs font-bold text-amber-700 leading-relaxed">
                      Payment integration is currently in Sandbox Mode. Clicking the button below will simulate a successful transaction.
                    </p>
                  </div>

                  <button 
                    onClick={handlePurchase}
                    disabled={isProcessing}
                    className="w-full py-5 bg-blue-50 text-[#1d46af] border-2 border-[#1d46af]/30 text-lg font-black rounded-2xl hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      <>
                        COMPLETE PURCHASE
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] font-medium leading-relaxed text-slate-400">
                    By completing your purchase you agree to our{" "}
                    <Link href="/terms-of-use" className="font-bold text-[#1d46af] hover:underline">Terms of Use</Link>,{" "}
                    <Link href="/privacy-policy" className="font-bold text-[#1d46af] hover:underline">Privacy Policy</Link> and{" "}
                    <Link href="/refund-policy" className="font-bold text-[#1d46af] hover:underline">Refund &amp; Cancellation Policy</Link>.
                    Digital access is delivered to your account; 14-day refund guarantee. Prices in USD.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <style jsx>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2s linear forwards;
        }
      `}</style>
    </div>
  );
}
