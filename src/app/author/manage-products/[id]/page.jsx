"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getProductById, updateProduct } from "@/services/product.service";
import { getAllQuestions, deleteQuestion, updateQuestion } from "@/services/question.service";
import { Package, ArrowLeft, Plus, Settings2, Database, Trash2, Edit2, Eye, Filter, Check, X, Shield, LayoutGrid, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductDetailsPage({ params }) {
    const router = useRouter();
    const { id } = use(params);
    const [ok, setOk] = useState(false);
    const [product, setProduct] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Taxonomy Management state
    const [newSystem, setNewSystem] = useState("");
    const [newSubject, setNewSubject] = useState("");
    const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

    // Auth check
    useEffect(() => {
        // Legacy Password Check Removed: Authorization now handled by AuthorLayout
        setOk(true);
    }, [router]);

    useEffect(() => {
        if (ok && id) {
            loadInitialData();
        }
    }, [ok, id]);

    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [p, allQs] = await Promise.all([
                getProductById(id),
                getAllQuestions()
            ]);
            
            if (!p) throw new Error("Product focus lost. Identifying sequence failed.");
            
            setProduct(p);
            // Filter questions by this packageId
            setQuestions(allQs.filter(q => q.packageId?.toString() === id.toString()));
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSystem = async () => {
        if (!newSystem.trim()) return;
        const updatedSystems = [...(product.systems || []), newSystem.trim()];
        const updatedProduct = { ...product, systems: updatedSystems };
        await saveTaxonomy(updatedProduct);
        setNewSystem("");
    };

    const handleRemoveSystem = async (sys) => {
        const updatedSystems = product.systems.filter(s => s !== sys);
        await saveTaxonomy({ ...product, systems: updatedSystems });
    };

    const handleAddSubject = async () => {
        if (!newSubject.trim()) return;
        const updatedSubjects = [...(product.subjects || []), newSubject.trim()];
        const updatedProduct = { ...product, subjects: updatedSubjects };
        await saveTaxonomy(updatedProduct);
        setNewSubject("");
    };

    const handleRemoveSubject = async (sub) => {
        const updatedSubjects = product.subjects.filter(s => s !== sub);
        await saveTaxonomy({ ...product, subjects: updatedSubjects });
    };

    const saveTaxonomy = async (updatedProduct) => {
        setIsSavingTaxonomy(true);
        try {
            await updateProduct(updatedProduct);
            setProduct(updatedProduct);
        } catch (err) {
            alert("Uplink failed: Could not synchronize taxonomy.");
        } finally {
            setIsSavingTaxonomy(false);
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!confirm("Confirm data erasure? This question will be permanently purged from the vault.")) return;
        try {
            await deleteQuestion(qId);
            setQuestions(prev => prev.filter(q => q.id !== qId));
        } catch (err) {
            alert("Deletion protocol failed.");
        }
    };

    if (!ok) return null;
    if (isLoading) return (
        <div className="min-h-screen bg-[#0E0E0E] flex flex-col items-center justify-center p-10">
            <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.3em]">Querying_Product_Archives...</p>
        </div>
    );
    if (error) return (
        <div className="min-h-screen bg-[#0E0E0E] flex flex-col items-center justify-center p-10 text-center">
            <Shield size={64} className="text-red-500 mb-6 opacity-30" />
            <h2 className="text-2xl font-black text-[#F3EBD3] uppercase italic mb-2">Protocol Error</h2>
            <p className="text-[#A39C86] max-w-md font-medium">{error}</p>
            <button onClick={() => router.push('/author/manage-products')} className="mt-8 px-6 py-3 bg-[#D4AF37] text-black rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Restore UI State</button>
        </div>
    );

    return (
        <div className="font-body min-h-screen bg-[#0E0E0E] relative overflow-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#D4AF37]/5 pointer-events-none" />
            
            <main className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
                {/* Header Sub-Bar */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => router.push('/author/manage-products')}
                        className="p-3 bg-[#141414] border border-[#2E2A1E] rounded-2xl hover:bg-[#111111] transition-all text-[#F3EBD3] shadow-sm group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-heading font-black tracking-tight text-[#F3EBD3] uppercase italic">{product.name}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.is_published ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                                {product.is_published ? 'Live_Stream' : 'Archived'}
                            </span>
                        </div>
                        <p className="text-[#A39C86] text-sm font-medium mt-1">Focusing Package ID: <span className="font-mono text-xs opacity-70 underline decoration-slate-300">{id}</span></p>
                    </div>
                    <div className="ml-auto flex gap-3">
                        <button 
                            onClick={() => router.push(`/author/create-question?packageId=${id}`)}
                            className="px-6 py-3 bg-[#D4AF37] text-black rounded-2xl hover:bg-[#B8922A] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 active:scale-95"
                        >
                            <Plus size={16} /> New Question
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar: Taxonomy Control */}
                    <div className="space-y-6">
                        {/* Systems Management */}
                        <section className="bg-[#141414] border border-[#2E2A1E] rounded-[32px] p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]" />
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3] flex items-center gap-2">
                                    <Layers size={14} className="text-[#D4AF37]" /> Medical Systems
                                </h2>
                                {isSavingTaxonomy && <div className="w-4 h-4 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />}
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                                <input 
                                    value={newSystem}
                                    onChange={e => setNewSystem(e.target.value)}
                                    placeholder="Add system..."
                                    className="bg-[#111111] border border-[#2E2A1E] px-4 py-2.5 rounded-xl flex-1 text-xs font-bold focus:ring-4 focus:ring-[#D4AF37]/5 focus:border-[#D4AF37] outline-none transition-all"
                                    onKeyDown={e => e.key === 'Enter' && handleAddSystem()}
                                />
                                <button onClick={handleAddSystem} className="p-2.5 bg-[#D4AF37] text-black rounded-xl hover:bg-[#B8922A] transition-all">
                                    <Check size={16} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {product.systems?.length === 0 ? (
                                    <div className="w-full py-6 text-center border-2 border-dashed border-[#1F1F1F] rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Systems Defined</p>
                                    </div>
                                ) : (
                                    product.systems?.map(sys => (
                                        <div key={sys} className="flex items-center gap-2 bg-[#111111] border border-[#2E2A1E] px-3 py-1.5 rounded-full text-[10px] font-black text-[#F3EBD3] uppercase tracking-tight group hover:border-[#D4AF37]/30 transition-all">
                                            {sys}
                                            <button onClick={() => handleRemoveSystem(sys)} className="hover:text-red-500 transition-colors">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Subjects Management */}
                        <section className="bg-[#141414] border border-[#2E2A1E] rounded-[32px] p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#C9A227]" />
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F3EBD3] flex items-center gap-2">
                                    <LayoutGrid size={14} className="text-[#C9A227]" /> Categories / Subjects
                                </h2>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input 
                                    value={newSubject}
                                    onChange={e => setNewSubject(e.target.value)}
                                    placeholder="Add subject..."
                                    className="bg-[#111111] border border-[#2E2A1E] px-4 py-2.5 rounded-xl flex-1 text-xs font-bold focus:ring-4 focus:ring-[#C9A227]/5 focus:border-[#C9A227] outline-none transition-all"
                                    onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                                />
                                <button onClick={handleAddSubject} className="p-2.5 bg-[#C9A227] text-black rounded-xl hover:bg-[#B8922A] transition-all">
                                    <Check size={16} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {product.subjects?.length === 0 ? (
                                    <div className="w-full py-6 text-center border-2 border-dashed border-[#1F1F1F] rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Subjects Defined</p>
                                    </div>
                                ) : (
                                    product.subjects?.map(sub => (
                                        <div key={sub} className="flex items-center gap-2 bg-[#111111] border border-[#2E2A1E] px-3 py-1.5 rounded-full text-[10px] font-black text-[#F3EBD3] uppercase tracking-tight group hover:border-[#C9A227]/30 transition-all">
                                            {sub}
                                            <button onClick={() => handleRemoveSubject(sub)} className="hover:text-red-500 transition-colors">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Main Content: Question List */}
                    <div className="lg:col-span-2">
                        <section className="bg-[#141414] border border-[#2E2A1E] rounded-[40px] shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                            <div className="p-8 border-b border-[#1F1F1F] flex items-center justify-between bg-[#111111]/50">
                                <div>
                                    <h2 className="text-xl font-heading font-black text-[#F3EBD3] uppercase italic flex items-center gap-2">
                                        <Database className="text-[#D4AF37]" size={20} /> Question <span className="text-[#D4AF37]">Portfolio</span>
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Uplink Status: {questions.length} Content Blocks Syncronized</p>
                                </div>
                            </div>

                            {questions.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                                    <div className="w-24 h-24 bg-[#111111] rounded-[32px] flex items-center justify-center mb-6">
                                        <Database size={40} className="text-slate-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-[#F3EBD3] uppercase italic mb-2">Portfolio Empty</h3>
                                    <p className="text-[#A39C86] text-sm max-w-xs font-semibold">No questions have been deployed to this product stream yet.</p>
                                    <button 
                                        onClick={() => router.push(`/author/create-question?packageId=${id}`)}
                                        className="mt-6 text-[#D4AF37] font-black uppercase text-[10px] tracking-[0.2em] hover:underline"
                                    >
                                        Initialize First Content Block →
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[#111111] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                <th className="px-8 py-5">Classification</th>
                                                <th className="px-8 py-5">Stem Reference</th>
                                                <th className="px-8 py-5">Status</th>
                                                <th className="px-8 py-5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1F1F1F]">
                                            {questions.map((q, idx) => (
                                                <motion.tr 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    key={q.id} 
                                                    className="hover:bg-[#111111]/50 transition-colors group"
                                                >
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black text-[#F3EBD3] uppercase leading-none">{q.system || 'Unclassified'}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{q.subject}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 max-w-xs">
                                                        <p className="text-xs font-medium text-[#B8B09A] line-clamp-1 group-hover:text-[#F3EBD3] transition-colors">{q.stem}</p>
                                                        <span className="text-[9px] font-mono text-slate-300 mt-1 block uppercase">ID: {q.id.substring(0,8)}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${q.published ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-[#111111] text-slate-400 border-[#2E2A1E]'}`}>
                                                            {q.published ? 'LIVE' : 'DRAFT'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => router.push(`/author/create-question?id=${q.id}`)}
                                                                className="p-2.5 rounded-xl bg-[#111111] text-slate-400 hover:bg-[#D4AF37] hover:text-white transition-all border border-[#2E2A1E]"
                                                                title="Edit Logic"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteQuestion(q.id)}
                                                                className="p-2.5 rounded-xl bg-[#111111] text-slate-400 hover:bg-red-500 hover:text-white transition-all border border-[#2E2A1E]"
                                                                title="Purge Object"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
