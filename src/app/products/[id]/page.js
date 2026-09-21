"use client";

import { useState, useEffect, useContext, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppContext } from "@/context/AppContext";
import { getProductById } from "@/services/product.service";
import CartDropdown from "@/components/student/layout/CartDropdown";
import { 
    ChevronLeft, 
    ShieldCheck, 
    Zap, 
    Activity, 
    Clock, 
    CreditCard, 
    ShoppingCart, 
    User,
    CheckCircle2,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { addToCart, cart, isCartOpen, setIsCartOpen } = useContext(AppContext);
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        const userId = localStorage.getItem("medbank_user");
        setIsLoggedIn(!!userId);
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        setLoading(true);
        try {
            const data = await getProductById(id);
            if (!data) throw new Error("Product focus lost.");
            setProduct(data);
        } catch (err) {
            console.error(err);
            setError("Could not retrieve product sequence.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (name, price, days, isBase = false) => {
        addToCart({
            id: isBase ? product.id : `${product.id}-${days}`,
            title: `${product.name} (${days} Days)`,
            price: price,
            duration: days,
            color: "bg-rose-500"
        });
        setToastMessage(`Added to Cart: ${days} Days Access`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setTimeout(() => setIsCartOpen(true), 300);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-[#1d46af] rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.3em]">Synching_Product_Stream...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center p-10 text-center">
                <Lock size={64} className="text-slate-200 mb-6" />
                <h2 className="text-2xl font-black text-slate-900 uppercase italic">Access Error</h2>
                <p className="text-slate-500 mt-2 font-medium">{error || "Product not found."}</p>
                <button 
                    onClick={() => router.push('/products')}
                    className="mt-8 px-8 py-3 bg-[#1d46af] text-white rounded-2xl font-black text-xs tracking-widest active:scale-95 transition-all"
                >
                    RETURN TO CATALOG
                </button>
            </div>
        );
    }

    // Combine primary tier with additional plans
    const allPlans = [
        { days: product.duration_days, price: product.price, isBase: true },
        ...(product.plans || [])
    ].sort((a, b) => a.days - b.days);

    return (
        <div className="min-h-screen bg-[#fcfdfe] flex flex-col">
            {/* Navigation (Simplified) */}
            <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <button 
                        onClick={() => router.push('/products')}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Catalog
                    </button>
                    
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <button 
                                onClick={() => setIsCartOpen(!isCartOpen)} 
                                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1d46af] transition-colors relative"
                            >
                                <ShoppingCart size={20} />
                                {cart.length > 0 && (
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1d46af] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                            <CartDropdown />
                        </div>
                        {isLoggedIn ? (
                             <button onClick={() => router.push('/student/portal')} className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#1d46af] border border-blue-100">
                                <User size={20} />
                             </button>
                        ) : (
                            <button onClick={() => router.push('/auth')} className="px-5 py-2 bg-[#1d46af] text-white rounded-xl text-xs font-black tracking-widest hover:bg-[#16368a] transition-all">
                                LOG IN
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-8 right-8 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
                    >
                        <CheckCircle2 size={20} />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="flex-1 pt-32 pb-24 px-6">
                <div className="mx-auto max-w-5xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                        
                        {/* Branding & Info */}
                        <div className="lg:col-span-7 space-y-8">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-[2rem] bg-rose-500 shadow-xl shadow-rose-500/20 text-white">
                                <Activity size={32} />
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-6xl font-[1000] text-slate-900 tracking-tighter leading-none">
                                    {product.name}
                                </h1>
                                <p className="text-xl text-slate-500 font-medium leading-relaxed">
                                    {product.description || "The definitive medical training sequence. Synchronized with actual board requirements and residency benchmarks."}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d46af] flex items-center justify-center mb-4">
                                        <Zap size={20} />
                                    </div>
                                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Instant Activation</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Uplink starts immediately</p>
                                </div>
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Data Integrity</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Verified Clinical Source</p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100/50">
                                <h3 className="text-[10px] font-[1000] text-slate-400 uppercase tracking-[0.4em] mb-6">Course Syllabus Coverate</h3>
                                <div className="flex flex-wrap gap-2">
                                    {product.systems?.map(s => (
                                        <span key={s} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-tight">{s}</span>
                                    ))}
                                    {(!product.systems || product.systems.length === 0) && (
                                        <span className="text-xs font-bold text-slate-300 italic uppercase">Universal Access Sequence Active</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pricing Selection */}
                        <div className="lg:col-span-5">
                            <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-blue-500/5 sticky top-32">
                                <div className="mb-10 text-center">
                                    <h2 className="text-xl font-[1000] text-slate-900 uppercase tracking-tighter italic">Select Access <span className="text-[#1d46af]">Variant</span></h2>
                                    <div className="h-1 w-12 bg-blue-100 mx-auto mt-4 rounded-full" />
                                </div>

                                <div className="space-y-4">
                                    {allPlans.map((plan, idx) => (
                                        <div 
                                            key={idx}
                                            className={`p-6 rounded-[2.5rem] border-2 transition-all group flex flex-col gap-4 ${
                                                plan.isBase 
                                                ? 'bg-blue-50/30 border-[#1d46af]/20 hover:border-[#1d46af]/50' 
                                                : 'bg-white border-slate-100 hover:border-blue-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                                        plan.isBase ? 'bg-[#1d46af] text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-[#1d46af]'
                                                    }`}>
                                                        <Clock size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-lg font-black text-slate-900 tracking-tight">{plan.days} Days</div>
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Protocol</div>
                                                    </div>
                                                </div>
                                                <div className="text-2xl font-black text-slate-900">${plan.price} USD</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => handleAddToCart(product.name, plan.price, plan.days, plan.isBase)}
                                                    className="py-3.5 px-4 bg-white border-2 border-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    Add <ShoppingCart size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        handleAddToCart(product.name, plan.price, plan.days, plan.isBase);
                                                        router.push('/checkout');
                                                    }}
                                                    className="py-3.5 px-4 bg-[#1d46af] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#16368a] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                                >
                                                    Checkout <CreditCard size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-50 space-y-4">
                                    <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Secure clinical payment processing active
                                    </div>
                                    <p className="text-[9px] text-slate-300 font-medium uppercase tracking-[0.1em] text-center italic">
                                        By confirming purchase you agree to the medical data sync protocol and institutional terms of service.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-20 px-6">
                <div className="mx-auto max-w-7xl text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">Institutional Protocol Active</p>
                    <p className="text-slate-400 text-sm font-medium">© 2026 IskyMD Universal Systems. Clinical Precision Guaranteed.</p>
                    <p className="mt-4 text-slate-400 text-xs font-medium">
                        Digital access delivered to your account. 14-day refund guarantee. Prices in USD.{" "}
                        <Link href="/refund-policy" className="font-bold text-[#1d46af] hover:underline">Refund Policy</Link>{" · "}
                        <Link href="/terms-of-use" className="font-bold text-[#1d46af] hover:underline">Terms</Link>{" · "}
                        <Link href="/privacy-policy" className="font-bold text-[#1d46af] hover:underline">Privacy</Link>
                    </p>
                </div>
            </footer>
        </div>
    );
}
