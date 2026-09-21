"use client";

import React, { useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, Trash2, ArrowRight, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/context/AppContext";

export default function CartDropdown() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart } = useContext(AppContext);
  const router = useRouter();

  if (!isCartOpen) return null;

  return (
    <div className="relative">
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsCartOpen(false)}
            />
            
            {/* Dropdown Card */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-4 w-[380px] bg-white rounded-[2.5rem] shadow-2xl border-2 border-[#1d46af]/20 overflow-hidden z-50 p-8"
            >
              <div className="flex items-center justify-between mb-8 border-b-2 border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1d46af]">
                    <ShoppingCart size={20} />
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight">Your Cart</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {cart.reduce((total, item) => total + (item.quantity || 1), 0)} Items
                  </span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-200 hover:border-red-200"
                >
                  <X size={18} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="text-slate-400 font-bold text-sm tracking-tight">Your cart is empty</p>
                  <button 
                    onClick={() => {
                        setIsCartOpen(false);
                        router.push('/products');
                    }}
                    className="mt-4 text-[#1d46af] text-xs font-black uppercase tracking-widest hover:underline"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 scroll-smooth">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 group relative p-3 rounded-2xl hover:bg-slate-50 transition-all">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 border border-rose-100/50 relative">
                          <Activity size={24} />
                          {(item.quantity || 1) > 1 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#1d46af] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                {item.quantity}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-800 text-sm truncate">{item.title}</h4>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                            {item.duration || 90}-Day Access {(item.quantity || 1) > 1 && `(x${item.quantity})`}
                          </p>
                          <div className="mt-1">
                            <span className="text-[#1d46af] font-black text-sm">${(item.price * (item.quantity || 1)).toFixed(2)} USD</span>
                            {(item.quantity || 1) > 1 && <span className="text-slate-400 text-[10px] font-medium ml-2">${item.price} USD/each</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-200 hover:border-red-200 shrink-0"
                          title="Remove from cart"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-50">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                      <span className="text-2xl font-black text-slate-900 leading-none">
                        ${cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0).toFixed(2)} USD
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        router.push('/checkout');
                      }}
                      className="w-full py-4 bg-blue-50 text-[#1d46af] border-2 border-[#1d46af]/30 text-sm font-black rounded-2xl hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/5"
                    >
                      PROCEED TO CHECKOUT
                      <ArrowRight size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        router.push('/products');
                      }}
                      className="w-full mt-3 py-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-[#1d46af] transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
