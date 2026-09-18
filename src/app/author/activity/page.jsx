"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, MessageSquare, Shield, Clock, BookOpen, ChevronRight, User, DollarSign, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ActivityFeedPage() {
    const router = useRouter();
    const [ok, setOk] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState(""); // registration, purchase
    const [searchQuery, setSearchQuery] = useState("");

    // Auth check
    useEffect(() => {
        // Legacy Password Check Removed: Authorization now handled by AuthorLayout
        setOk(true);
    }, [router]);

    useEffect(() => {
        if (ok) loadActivity();
    }, [ok]);

    const loadActivity = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/notifications?limit=100');
            const data = await res.json();
            setNotifications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = notifications.filter(n => {
        const matchesFilter = !filterType || n.type === filterType;
        const matchesSearch = !searchQuery || n.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (!ok) return null;

    return (
        <div className="font-body min-h-screen bg-[#F1F4F7] relative overflow-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#0066CC]/5 pointer-events-none" />
            
            <main className="max-w-[1200px] mx-auto px-6 py-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-4xl font-heading font-black tracking-tighter text-[#1B263B] uppercase italic flex items-center gap-3">
                            <Activity className="text-[#0066CC]" size={36} /> System <span className="text-[#0066CC]">Activity</span>
                        </h1>
                        <p className="text-slate-500 mt-2 text-sm font-semibold tracking-tight uppercase">Master Ledger of Student Uplinks and Transactions</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            placeholder="Find event or student identifier..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/90 backdrop-blur-sm border border-slate-200 pl-12 pr-4 py-4 rounded-[24px] focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all font-black shadow-sm text-[#1B263B] uppercase tracking-tight"
                        />
                    </div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-white/90 backdrop-blur-sm text-[#1B263B] border border-slate-200 px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all cursor-pointer hover:bg-slate-50 shadow-sm"
                    >
                        <option value="">All Events</option>
                        <option value="registration">Registrations</option>
                        <option value="purchase">Paid Activations</option>
                        <option value="feedback">Feedback</option>
                    </select>

                    <button
                        onClick={loadActivity}
                        className="p-4 bg-white/90 backdrop-blur-sm border border-slate-200 text-[#1B263B] hover:bg-slate-50 rounded-[24px] transition-all shadow-sm active:scale-95"
                        title="Reload Ledger"
                    >
                        <Clock size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#0066CC]/20 border-t-[#0066CC] rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-mono text-[10px] font-black uppercase tracking-[0.3em]">Querying_Database_Archives...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-20 bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-200 text-center shadow-lg">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Activity size={40} className="text-slate-300" />
                        </div>
                        <h3 className="font-heading font-black text-2xl mb-2 text-[#1B263B] uppercase italic">Zero Activity Detected</h3>
                        <p className="text-slate-500 text-sm font-semibold max-w-xs mx-auto">The system ledger is currently empty for the selected filters.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((n, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                key={n.id}
                                className="bg-white/90 backdrop-blur-sm border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all flex items-center gap-6"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                                    n.type === 'purchase' 
                                        ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                        : n.type === 'feedback'
                                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                          : 'bg-blue-100 text-blue-600 border border-blue-200'
                                }`}>
                                    {n.type === 'purchase' ? <DollarSign size={24} /> : n.type === 'feedback' ? <MessageSquare size={24} /> : <User size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-full border ${
                                             n.type === 'purchase' ? 'bg-emerald-50 text-white border-emerald-600' : n.type === 'feedback' ? 'bg-amber-500 text-white border-amber-600' : 'bg-blue-600 text-white border-blue-700'
                                        }`}>
                                            {n.type === 'purchase' ? 'FINANCIAL' : n.type === 'feedback' ? 'FEEDBACK' : 'PERSONNEL'}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tighter">
                                            {new Date(n.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-[#1B263B] uppercase tracking-tight italic leading-none">{n.message}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Logged_Success // Archive_ID: {n.id}</p>
                                </div>
                                <div className="hidden md:flex flex-col items-end gap-2 pr-4">
                                    <button 
                                      onClick={() => router.push(`/author/users?search=${n.metadata?.email || ''}`)}
                                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0066CC] hover:underline"
                                    >
                                        Inspect Identity <ChevronRight size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
