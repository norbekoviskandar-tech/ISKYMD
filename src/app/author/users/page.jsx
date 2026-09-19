"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers, updateUserSubscription, getStudentProgress, banUser } from "@/services/user.service";
import { useDeleteItem } from "@/hooks/useDeleteItem";
import UserProfileModal from "@/components/author/UserProfileModal";
import { Search, Filter, MessageSquare, Shield, Clock, BookOpen, ChevronRight, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ManageUsersPage() {
    const router = useRouter();
    const [ok, setOk] = useState(false);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // Delete hook
    const { handleBulkDelete: bulkDeleteUsers, isDeleting } = useDeleteItem(
        'user',
        setUsers,
        setSelectedIds
    );

    // Auth check
    useEffect(() => {
        // Legacy Password Check Removed: Authorization now handled by AuthorLayout
        setOk(true);
    }, [router]);

    useEffect(() => {
        if (ok) loadUsers();
    }, [ok]);

    const loadUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const all = await getAllUsers();
            let activeProductId = null;
            try {
                const storedContext = localStorage.getItem("medbank_author_product_context");
                const parsedContext = storedContext ? JSON.parse(storedContext) : null;
                activeProductId = parsedContext?.id ? String(parsedContext.id) : null;
            } catch (e) {
                activeProductId = null;
            }

            // Enrich users with progress data
            const enriched = await Promise.all(all.map(async (u) => {
                const progress = await getStudentProgress(u.id, activeProductId);
                return { ...u, progress };
            }));
            setUsers(enriched);
        } catch (err) {
            console.error(err);
            setError("Failed to load user data");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !filterStatus || 
            (filterStatus === 'paid' ? (u.subscriptionStatus === 'active' && (u.activatedByPurchase || u.purchased)) :
             filterStatus === 'trial' ? (u.subscriptionStatus === 'active' && !(u.activatedByPurchase || u.purchased)) :
             u.subscriptionStatus === filterStatus);
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const toggleSelectOne = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkBan = async () => {
        if (!confirm(`Are you sure you want to REVOKE ACCESS for ${selectedIds.size} users?`)) return;
        setIsBulkLoading(true);
        try {
            for (const id of Array.from(selectedIds)) {
                await banUser(id);
            }
            alert(`Uplink Severed: ${selectedIds.size} personnel records suspended and login access revoked.`);
            setSelectedIds(new Set());
            loadUsers();
        } catch (err) {
            console.error(err);
            alert("Security Protocol Error: Failed to sever user uplinks.");
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        setIsBulkLoading(true);
        
        try {
            await bulkDeleteUsers(ids, {
                confirmMessage: `CRITICAL: Are you sure you want to PERMANENTLY DELETE ${ids.length} accounts? This action will PURGE ALL DATA and cannot be undone.`,
                successMessage: `Purge Complete: ${ids.length} identities erased from master registry.`
            });
        } finally {
            setIsBulkLoading(false);
        }
    };

    if (!ok) return null;

    return (
        <div className="font-body min-h-screen bg-[#0E0E0E] relative overflow-auto">
            {/* Background Blend Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#D4AF37]/5 pointer-events-none" />
            
            <main className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-4xl font-heading font-black tracking-tighter text-[#F3EBD3] uppercase italic">Personnel <span className="text-[#D4AF37]">Registry</span></h1>
                        <p className="text-[#A39C86] mt-2 text-sm font-semibold tracking-tight">System-wide monitoring of student access, credentials, and progress metrics</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {selectedIds.size > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 bg-[#141414] p-2 pl-4 rounded-2xl border border-[#D4AF37]/20 shadow-lg"
                            >
                                <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mr-2">{selectedIds.size} Selected</span>
                                <button 
                                    onClick={handleBulkBan}
                                    className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md active:scale-95"
                                >
                                    Ban Access
                                </button>
                                <button 
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md active:scale-95"
                                >
                                    Terminate Account
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#141414] border border-[#2E2A1E] pl-12 pr-4 py-3 rounded-2xl focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] outline-none transition-all font-black shadow-sm text-[#F3EBD3] uppercase tracking-tight"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-[#141414] text-[#F3EBD3] border border-[#2E2A1E] px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] outline-none transition-all cursor-pointer hover:bg-[#111111] shadow-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active (All)</option>
                        <option value="paid">Paid Access</option>
                        <option value="trial">Free Trial</option>
                        <option value="expired">Expired</option>
                        <option value="canceled">Canceled</option>
                    </select>

                    <button
                        onClick={loadUsers}
                        className="p-3 bg-[#141414] border border-[#2E2A1E] text-[#F3EBD3] hover:bg-[#111111] rounded-2xl transition-all shadow-sm"
                        title="Refresh List"
                    >
                        <Clock size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-mono text-[10px] font-black uppercase tracking-[0.3em]">Hydrating_User_Registry...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 bg-red-50 text-red-600 rounded-3xl border border-red-100 text-center font-black uppercase text-xs tracking-widest">
                        {error}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-20 bg-[#141414] rounded-[40px] border border-[#2E2A1E] text-center shadow-sm">
                        <div className="w-20 h-20 bg-[#111111] rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <User size={40} className="text-[#D4AF37]" />
                        </div>
                        <h3 className="font-heading font-black text-2xl mb-2 text-[#F3EBD3] uppercase italic">Empty Registry</h3>
                        <p className="text-[#A39C86] text-sm font-semibold max-w-xs mx-auto">No student identities detected matching the current search parameters.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden bg-[#141414] rounded-[40px] border border-[#2E2A1E] shadow-[0_15px_40px_rgba(0,0,94,0.04)]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#1F1F1F] bg-[#111111]/50">
                                    <th className="px-8 py-6 w-16">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded-md border-[#3A3526] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer shadow-sm"
                                            checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3]">Student Identity</th>
                                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3]">Subscription</th>
                                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3]">Enrolled</th>
                                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3]">Registry Progress</th>
                                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F1F1F]">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-[#1A1810]/40 transition-all group ${selectedIds.has(user.id) ? 'bg-[#D4AF37]/5' : ''}`}>
                                        <td className="px-8 py-6">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded border-[#3A3526] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer shadow-sm"
                                                checked={selectedIds.has(user.id)}
                                                onChange={() => toggleSelectOne(user.id)}
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/10 to-[#F0D77A]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black shadow-sm text-lg">
                                                    {user.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-black text-[#F3EBD3] text-[15px] group-hover:text-[#D4AF37] transition-colors uppercase tracking-tight">{user.name || 'Anonymous Student'}</div>
                                                    <div className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit shadow-sm border ${
                                                    user.subscriptionStatus === 'active' ? 'bg-[#8A6D1B]/10 text-[#8A6D1B] border-[#8A6D1B]/20' :
                                                    user.subscriptionStatus === 'expired' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                    'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.subscriptionStatus === 'active' ? 'bg-[#8A6D1B] animate-pulse' :
                                                            user.subscriptionStatus === 'expired' ? 'bg-amber-500' :
                                                                'bg-red-500'
                                                        }`} />
                                                    {user.subscriptionStatus === 'active'
                                                        ? (user.activatedByPurchase || user.purchased ? 'PAID_ACCESS' : 'TRIAL_UPLINK')
                                                        : user.subscriptionStatus?.toUpperCase() || 'OFFLINE'
                                                    }
                                                </span>
                                                {(user.activatedByPurchase || user.purchased) && user.expiresAt && (
                                                    <div className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mt-1 ml-1 opacity-70">
                                                        EXP: {new Date(user.expiresAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-xs font-black text-[#F3EBD3] uppercase tracking-widest opacity-80 font-mono">
                                                {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2 w-48">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">{user.progress?.percentage}% Mastery</span>
                                                    <span className="text-[10px] font-black font-mono text-slate-400">{user.progress?.completed}/{user.progress?.total}</span>
                                                </div>
                                                <div className="h-2 w-full bg-[#171717] rounded-full overflow-hidden border border-[#2E2A1E]">
                                                    <div
                                                        className="h-full bg-[#D4AF37] transition-all duration-1000 shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                                                        style={{ width: `${user.progress?.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => setSelectedUser(user)}
                                                className="p-3 rounded-2xl bg-[#141414] hover:bg-[#D4AF37] hover:text-white transition-all border border-[#2E2A1E] shadow-sm group/btn"
                                            >
                                                <ChevronRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {selectedUser && (
                <UserProfileModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdate={loadUsers}
                />
            )}
        </div>
    );
}
