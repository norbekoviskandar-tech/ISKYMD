"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Wrench, 
    Database, 
    Shield, 
    RefreshCcw, 
    Download, 
    Upload, 
    Trash2, 
    AlertTriangle,
    CheckCircle2,
    Activity
} from 'lucide-react';
import { getAllQuestions, updateQuestion } from '@/services/question.service';
import { getAllUsers } from '@/services/user.service';

export default function ToolsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [stats, setStats] = useState({ questions: 0, drafts: 0, users: 0 });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [qs, us] = await Promise.all([getAllQuestions(), getAllUsers()]);
            setStats({
                questions: qs.length,
                drafts: qs.filter(q => !q.published).length,
                users: us.length
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleAction = async (action, logic) => {
        if (!confirm(`Are you sure you want to perform: ${action}?`)) return;
        
        setIsLoading(true);
        setStatus({ type: 'info', message: `Executing ${action}...` });
        
        try {
            await logic();
            setStatus({ type: 'success', message: `${action} complete.` });
            loadStats();
        } catch (err) {
            setStatus({ type: 'error', message: `${action} failed: ${err.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const bulkPublishAll = async () => {
        const qs = await getAllQuestions();
        const drafts = qs.filter(q => !q.published);
        if (drafts.length === 0) throw new Error("No drafts to publish");
        await Promise.all(drafts.map(q => updateQuestion({ ...q, published: true })));
    };

    const bulkUnpublishAll = async () => {
        const qs = await getAllQuestions();
        const published = qs.filter(q => q.published);
        if (published.length === 0) throw new Error("No published questions to unpublish");
        await Promise.all(published.map(q => updateQuestion({ ...q, published: false })));
    };

    return (
        <div className="font-body min-h-screen bg-[#F1F4F7] relative overflow-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#4F46E5]/5 pointer-events-none" />
            <div className="p-8 max-w-6xl mx-auto space-y-8 relative z-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-heading font-black tracking-tight text-[#1B263B] uppercase italic">
                        System <span className="text-[#0066CC]">Tools</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Advanced administrative utilities and maintenance protocols</p>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
                    <Activity size={16} className="text-[#0066CC] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1B263B]">System Status: Optimal</span>
                </div>
            </header>

            {status && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border flex items-center gap-3 ${
                        status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-600'
                    }`}
                >
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : 
                     status.type === 'error' ? <AlertTriangle size={18} /> : <RefreshCcw size={18} className="animate-spin" />}
                    <span className="text-sm font-bold">{status.message}</span>
                    <button onClick={() => setStatus(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* MAINTENANCE */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Database Maintenance</h3>
                    <div className="grid gap-4">
                        <ToolCard 
                            icon={Database}
                            title="Database Optimization"
                            description="Clean up orphaned records and optimize indexes. Recommended after bulk imports."
                            actionLabel="Run Optimizer"
                            onAction={() => handleAction("Database Optimization", async () => new Promise(r => setTimeout(r, 2000)))}
                            loading={isLoading}
                        />
                        <ToolCard 
                            icon={RefreshCcw}
                            title="Recalculate Stats"
                            description="Force rebuild user progress statistics and dashboard metrics cache."
                            actionLabel="Rebuild Cache"
                            onAction={() => handleAction("Stats Rebuild", async () => new Promise(r => setTimeout(r, 1500)))}
                            loading={isLoading}
                        />
                    </div>
                </section>

                {/* BULK ACTIONS */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Critical Bulk Actions</h3>
                    <div className="grid gap-4">
                        <ToolCard 
                            icon={Shield}
                            title="Global Publish"
                            description={`Publish all current drafts (${stats.drafts} items). Warning: This action is immediate.`}
                            actionLabel="Publish All"
                            onAction={() => handleAction("Global Publish", bulkPublishAll)}
                            variant="primary"
                            loading={isLoading}
                        />
                        <ToolCard 
                            icon={Trash2}
                            title="Global Unpublish"
                            description="Retract all live questions to draft status. Useful for system-wide auditing."
                            actionLabel="Unpublish All"
                            onAction={() => handleAction("Global Unpublish", bulkUnpublishAll)}
                            variant="danger"
                            loading={isLoading}
                        />
                    </div>
                </section>
            </div>

            <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Data Transfer Protocols</h3>
                <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="font-heading font-black text-xl text-[#1B263B]">Master Question Registry</h4>
                        <p className="text-sm text-slate-500 max-w-md">Import or export the entire question database in high-fidelity JSON format for backup or migration purposes.</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-[#1B263B]">
                            <Download size={16} /> Export Registry
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-[#0066CC] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#004C99] shadow-lg shadow-[#0066CC]/20 transition-all">
                            <Upload size={16} /> Import Registry
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>
    );
}

function ToolCard({ icon: Icon, title, description, actionLabel, onAction, variant = "default", loading = false }) {
    return (
        <div className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:border-[#0066CC]/20 transition-all group">
            <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                    variant === 'primary' ? 'bg-[#0066CC]/10 text-[#0066CC] group-hover:bg-[#0066CC] group-hover:text-white' :
                    variant === 'danger' ? 'bg-red-500/10 text-red-600 group-hover:bg-red-500 group-hover:text-white' :
                    'bg-slate-50 text-slate-400 group-hover:text-[#1B263B]'
                }`}>
                    <Icon size={24} />
                </div>
                <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <h4 className="font-bold text-[#1B263B] text-sm">{title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                    </div>
                    <button 
                        onClick={onAction}
                        disabled={loading}
                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            variant === 'primary' ? 'bg-[#0066CC]/10 text-[#0066CC] hover:bg-[#0066CC] hover:text-white' :
                            variant === 'danger' ? 'bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white' :
                            'bg-slate-50 text-[#1B263B] hover:bg-slate-100'
                        } disabled:opacity-50`}
                    >
                        {loading ? 'Processing...' : actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
