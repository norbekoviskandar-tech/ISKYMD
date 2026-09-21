"use client";
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, User, Sun, Moon, Menu, RefreshCw, DollarSign, Package, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '@/context/AppContext';
import { getAllProducts } from '@/services/product.service';
import Link from 'next/link';

const AuthorHeader = () => {
    const { theme, toggleTheme, toggleSidebar, sidebarCollapsed, selectedAuthorProduct, setGlobalAuthorProduct } = useContext(AppContext);
    const pathname = usePathname();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [products, setProducts] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [user, setUser] = useState(null);

    const [showProductDropdown, setShowProductDropdown] = useState(false);

    // Close dropdown on click outside
    useEffect(() => {
        const h = () => setShowProductDropdown(false);
        if (showProductDropdown) window.addEventListener('click', h);
        return () => window.removeEventListener('click', h);
    }, [showProductDropdown]);

    // Load products for context switcher and enforce context selection
    useEffect(() => {
        getAllProducts().then(data => {
            setProducts(data || []);
            if (!selectedAuthorProduct && data && data.length > 0) {
                setGlobalAuthorProduct(data[0]);
            }
        }).catch(console.error);
    }, [setGlobalAuthorProduct]);

    const fetchNotifications = useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        try {
            const res = await fetch('/api/notifications?limit=5');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, []);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
            }
        };

        const fetchUser = async () => {
            const userId = localStorage.getItem("medbank_user");
            if (userId) {
                try {
                    const { getUserById } = await import("@/services/user.service");
                    const u = await getUserById(userId);
                    setUser(u);
                } catch (e) {}
            }
        };

        fetchNotifications();
        fetchUser();
        const interval = setInterval(fetchNotifications, 60000);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [fetchNotifications]);

    const markAllRead = async () => {
        setUnreadCount(0);
        // We could send updates to API here if we wanted to persist read state across sessions
    };

    return (
        <header className="sticky top-0 z-40 w-full bg-background/60 backdrop-blur-xl border-b border-border/50 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer group">
                <button
                    onClick={toggleSidebar}
                    className={`p-2.5 rounded-2xl transition-all duration-500 border ${sidebarCollapsed
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] animate-pulse'
                        : 'bg-panel border-border text-muted-foreground hover:text-[#D4AF37] hover:border-[#D4AF37]/30 hover:bg-[#1C1A14]'
                        }`}
                    title={sidebarCollapsed ? "Expand Navigation" : "Collapse Navigation"}
                >
                    <Menu size={22} className={sidebarCollapsed ? 'scale-110' : ''} />
                </button>
                <div className="flex flex-col">
                    <span className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.25em]">Context /</span>

                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowProductDropdown(!showProductDropdown)}
                            className="flex items-center gap-2 text-[#F3EBD3] font-bold text-sm hover:text-[#D4AF37] transition-colors"
                        >
                            <Package size={14} className="text-[#D4AF37]" />
                            {selectedAuthorProduct ? selectedAuthorProduct.name : 'Select Vault context'}
                            <span className={`text-[9px] text-slate-400 transition-transform duration-300 ${showProductDropdown ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        <AnimatePresence>
                            {showProductDropdown && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 mt-2 w-64 bg-[#141414] border border-[#2E2A1E] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                                >
                                    <div className="p-2 space-y-1">
                                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {products.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setGlobalAuthorProduct(p);
                                                        setShowProductDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 mb-1 ${selectedAuthorProduct?.id === p.id ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'hover:bg-[#111111] text-[#B8B09A]'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedAuthorProduct?.id === p.id ? 'bg-[#D4AF37]' : 'bg-[#2A2A2A]'}`} />
                                                    {p.name}{p.is_published === false ? <span className="ml-auto text-[9px] uppercase tracking-widest text-amber-500">hidden</span> : null}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="h-[1px] bg-[#171717] my-1 mx-2" />
                                        <Link 
                                            href="/author/manage-products" 
                                            onClick={() => setShowProductDropdown(false)}
                                            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-[#D4AF37] uppercase tracking-widest hover:bg-[#D4AF37]/5 rounded-xl transition-all"
                                        >
                                            Manage Streams →
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden lg:flex items-center gap-3 bg-[#141414] border border-[#2E2A1E] rounded-2xl px-4 py-2 hover:border-[#D4AF37]/30 transition-all group shadow-sm">
                    <Search size={16} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search workspace..."
                        className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-48 focus:w-64 transition-all"
                    />
                </div>

                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-2xl bg-panel hover:bg-border/50 text-muted-foreground hover:text-foreground transition-all border border-border"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowNotifications(!showNotifications);
                                if (!showNotifications) markAllRead();
                            }}
                            className="p-2.5 rounded-2xl bg-panel hover:bg-border/50 text-muted-foreground hover:text-foreground transition-all relative border border-border"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse"></div>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-80 bg-[#141414] border border-[#2E2A1E] rounded-[32px] shadow-2xl overflow-hidden z-50 origin-top-right text-left"
                                >
                                    <div className="p-5 border-b border-[#1F1F1F] flex items-center justify-between bg-[#111111]/50">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#F3EBD3]">System Activity</span>
                                        <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Latest_Uplinks</span>
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <div className="text-slate-300 mb-2 font-black uppercase text-[10px]">No recent data</div>
                                                <p className="text-slate-400 text-[10px]">System monitoring is active.</p>
                                            </div>
                                        ) : (
                                            notifications.map((n, idx) => (
                                                <div key={idx} className="p-4 border-b border-[#1F1F1F] hover:bg-[#111111]/50 transition-colors cursor-default">
                                                    <div className="flex gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                          n.type === 'purchase'
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : n.type === 'feedback'
                                                              ? 'bg-amber-100 text-amber-700'
                                                              : 'bg-[#241F10] text-[#C9A227]'
                                                        }`}>
                                                            {n.type === 'purchase' ? <DollarSign size={14} /> : n.type === 'feedback' ? <MessageSquare size={14} /> : <User size={14} />}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-bold text-[#F3EBD3] leading-tight">{n.message}</p>
                                                            <p className="text-[9px] font-mono text-slate-400 uppercase">{new Date(n.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <Link
                                        href="/author/activity"
                                        onClick={() => setShowNotifications(false)}
                                        className="block p-4 text-center text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#111111] transition-colors bg-[#141414] border-t border-[#1F1F1F]"
                                    >
                                        View Master Logs <RefreshCw size={10} className="inline ml-1" />
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button 
                        onClick={() => window.location.reload()}
                        className="p-2.5 rounded-2xl bg-panel hover:bg-border/50 text-muted-foreground hover:text-foreground transition-all border border-border"
                        title="Refresh Page"
                    >
                        <RefreshCw size={20} />
                    </button>

                    <div className="h-8 w-[1px] bg-border/50 mx-2"></div>

                    <div className="flex items-center gap-3 pl-2">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-foreground">{user?.name || 'MedBank Author'}</div>
                            <div className="text-[10px] font-mono text-[#A39C86] uppercase tracking-tighter">{user?.role === 'author' ? 'Master_Author' : 'Verified_Auth'}</div>
                        </div>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/10 to-[#C9A227]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] overflow-hidden cursor-pointer shadow-sm"
                        >
                            <User size={20} />
                        </motion.div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AuthorHeader;
