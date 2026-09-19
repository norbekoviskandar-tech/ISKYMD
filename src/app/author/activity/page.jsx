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
        <div className="font-body min-h-screen bg-[#0E0E0E] relative overflow-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#D4AF37]/5 pointer-events-none" />
            
            <main className="max-w-[1200px] mx-auto px-6 py-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-4xl font-heading font-black tracking-tighter text-[#F3EBD3] uppercase italic flex items-center gap-3">
                            <Activity className="text-[#D4AF37]" size={36} /> System <span className="text-[#D4AF37]">Activity</span>
                        </h1>
                        <p className="text-[#A39C86] mt-2 text-sm font-semibold tracking-tight uppercase">Master Ledger of Student Uplinks and Transactions</p>
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
                            className="w-full bg-[#141414]/90 backdrop-blur-sm border border-[#2E2A1E] pl-12 pr-4 py-4 rounded-[24px] focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] outline-none transition-all font-black shadow-sm text-[#F3EBD3] uppercase tracking-tight"
                        />
                    </div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-[#141414]/90 backdrop-blur-sm text-[#F3EBD3] border border-[#2E2A1E] px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] outline-none transition-all cursor-pointer hover:bg-[#111111] shadow-sm"
                    >
                        <option value="">All Events</option>
                        <option value="registration">Registrations</option>
                        <option value="purchase">Paid Activations</option>
                        <option value="feedback">Feedback</option>
                    </select>

                    <button
                        onClick={loadActivity}
                        className="p-4 bg-[#141414]/90 backdrop-blur-sm border border-[#2E2A1E] text-[#F3EBD3] hover:bg-[#111111] rounded-[24px] transition-all shadow-sm active:scale-95"
                        title="Reload Ledger"
                    >
                        <Clock size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-mono text-[10px] font-black uppercase tracking-[0.3em]">Querying_Database_Archives...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-20 bg-[#141414]/80 backdrop-blur-md rounded-[40px] border border-[#2E2A1E] text-center shadow-lg">
                        <div className="w-20 h-20 bg-[#111111] rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Activity size={40} className="text-slate-300" />
                        </div>
                        <h3 className="font-heading font-black text-2xl mb-2 text-[#F3EBD3] uppercase italic">Zero Activity Detected</h3>
                        <p className="text-[#A39C86] text-sm font-semibold max-w-xs mx-auto">The system ledger is currently empty for the selected filters.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((n, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                key={n.id}
                                className="bg-[#141414]/90 backdrop-blur-sm border border-[#2E2A1E] p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all flex items-center gap-6"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                                    n.type === 'purchase' 
                                        ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                        : n.type === 'feedback'
                                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                          : 'bg-[#241F10] text-[#C9A227] border border-[#3A3010]'
                                }`}>
                                    {n.type === 'purchase' ? <DollarSign size={24} /> : n.type === 'feedback' ? <MessageSquare size={24} /> : <User size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-full border ${
                                             n.type === 'purchase' ? 'bg-emerald-50 text-black border-emerald-600' : n.type === 'feedback' ? 'bg-amber-500 text-black border-amber-600' : 'bg-[#C9A227] text-black border-[#B8922A]'
                                        }`}>
                                            {n.type === 'purchase' ? 'FINANCIAL' : n.type === 'feedback' ? 'FEEDBACK' : 'PERSONNEL'}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tighter">
                                            {new Date(n.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-[#F3EBD3] uppercase tracking-tight italic leading-none">{n.message}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Logged_Success // Archive_ID: {n.id}</p>
                                </div>
                                <div className="hidden md:flex flex-col items-end gap-2 pr-4">
                                    <button 
                                      onClick={() => router.push(`/author/users?search=${n.metadata?.email || ''}`)}
                                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
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
