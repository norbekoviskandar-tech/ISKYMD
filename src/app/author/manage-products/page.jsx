"use client";

import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { getAllProducts, addProduct, updateProduct } from "@/services/product.service";
import { useDeleteItem } from "@/hooks/useDeleteItem";
import { Package, Plus, Trash2, ShieldCheck, ShieldAlert, Edit2, Check, X, Tag, Clock, DollarSign, Database, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppContext } from "@/context/AppContext";

export default function ManageProductsPage() {
  const router = useRouter();
  const { setGlobalAuthorProduct } = useContext(AppContext);
  const [ok, setOk] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Delete hook
  const { handleDelete: deleteProduct, isDeleting, error: deleteError, clearError } = useDeleteItem(
    'product', 
    setProducts, 
    setSelectedIds
  );

  const ECG_SYSTEMS = ["Cardiology – ECG"];
  const ECG_SUBJECTS = [
    "Fundamentals & Chamber Enlargement",
    "Intraventricular Conduction Disturbances",
    "Myocardial Ischaemia & Stress Testing",
    "Supraventricular Arrhythmias",
    "Ventricular Arrhythmias & Tachycardias",
    "AV Blocks & Preexcitation",
    "Systemic, Drug, & Electrolyte Effects",
    "Technical Methods & Pacemakers",
    "Paediatric & Congenital ECG"
  ];

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    duration_days: "",
    price: "",
    description: "",
    templateType: "DEFAULT",
    systems: [],
    subjects: [],
    is_published: true,
    plans: [], // Array of {days, price}
    defaultCreateTestConfig: {
      columns: ["system"],
      modes: ["timed", "tutor"],
      blockSize: 40,
      negativeMarking: false
    }
  });

  // Auth check
  useEffect(() => {
    // Legacy Password Check Removed: Authorization now handled by AuthorLayout
    setOk(true);
  }, [router]);

  useEffect(() => {
    if (ok) loadProducts();
  }, [ok]);

  const addPlanTier = () => {
    setFormData(prev => ({
        ...prev,
        plans: [...prev.plans, { days: "", price: "" }]
    }));
  };

  const removePlanTier = (index) => {
    setFormData(prev => {
        const nextPlans = [...prev.plans];
        nextPlans.splice(index, 1);
        return { ...prev, plans: nextPlans };
    });
  };

  const updatePlanTier = (index, field, value) => {
    setFormData(prev => {
        const nextPlans = [...prev.plans];
        nextPlans[index] = { ...nextPlans[index], [field]: value };
        return { ...prev, plans: nextPlans };
    });
  };

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await getAllProducts();
      setProducts(all || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      duration_days: "",
      price: "",
      description: "",
      templateType: "DEFAULT",
      systems: [],
      subjects: [],
      is_published: true,
      plans: [],
      defaultCreateTestConfig: {
        columns: ["system"],
        modes: ["timed", "tutor"],
        blockSize: 40,
        negativeMarking: false
      }
    });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Create cleaned plans array
      const cleanedPlans = formData.plans
        .map(p => ({ days: parseInt(p.days), price: parseFloat(p.price) }))
        .filter(p => !isNaN(p.days) && !isNaN(p.price));

      const effectiveTemplateType = formData.templateType || 'DEFAULT';
      const effectiveSystems = effectiveTemplateType === 'ECG' ? ECG_SYSTEMS : (formData.systems || []);
      const effectiveSubjects = effectiveTemplateType === 'ECG' ? ECG_SUBJECTS : (formData.subjects || []);

      const newProduct = await addProduct({
        ...formData,
        templateType: effectiveTemplateType,
        systems: effectiveSystems,
        subjects: effectiveSubjects,
        duration_days: parseInt(formData.duration_days) || 0,
        price: parseFloat(formData.price) || 0,
        plans: cleanedPlans
      });
      
      // AUTO-FOCUS ON NEW PRODUCT
      if (newProduct && setGlobalAuthorProduct) {
        setGlobalAuthorProduct(newProduct);
      }
      
      resetForm();
      loadProducts();
      alert("Product launched successfully! Context locked to new stream.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const cleanedPlans = formData.plans
        .map(p => ({ days: parseInt(p.days), price: parseFloat(p.price) }))
        .filter(p => !isNaN(p.days) && !isNaN(p.price));

      const effectiveTemplateType = formData.templateType || 'DEFAULT';
      const effectiveSystems = effectiveTemplateType === 'ECG' ? ECG_SYSTEMS : (formData.systems || []);
      const effectiveSubjects = effectiveTemplateType === 'ECG' ? ECG_SUBJECTS : (formData.subjects || []);

      await updateProduct({
        ...formData,
        id: editingId,
        templateType: effectiveTemplateType,
        systems: effectiveSystems,
        subjects: effectiveSubjects,
        duration_days: parseInt(formData.duration_days) || 0,
        price: parseFloat(formData.price) || 0,
        plans: cleanedPlans
      });
      resetForm();
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      duration_days: product.duration_days?.toString() || "",
      price: product.price?.toString() || "",
      description: product.description || "",
      templateType: product.templateType || 'DEFAULT',
      systems: Array.isArray(product.systems) ? product.systems : [],
      subjects: Array.isArray(product.subjects) ? product.subjects : [],
      is_published: product.is_published,
      plans: product.plans || [],
      defaultCreateTestConfig: product.defaultCreateTestConfig || {
        columns: ["system"],
        modes: ["timed", "tutor"],
        blockSize: 40,
        negativeMarking: false
      }
    });
    setEditingId(product.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    await deleteProduct(id, {
      onSuccess: () => {
        // Clear editing if deleted item was being edited
        if (editingId === id) {
          setEditingId(null);
          setShowCreateForm(false);
        }
      }
    });
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleToggleVisibility = async (product) => {
    try {
      await updateProduct({ ...product, is_published: !product.is_published });
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkToggleVisibility = async (published) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setIsLoading(true);
    try {
      await Promise.all(ids.map(id => {
        const p = products.find(prod => prod.id === id);
        return updateProduct({ ...p, is_published: published });
      }));
      setSelectedIds(new Set());
      loadProducts();
    } catch (err) {
      alert("Bulk operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!ok) return null;

    return (
      <div className="font-body min-h-screen bg-[#0E0E0E] relative overflow-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#C9A227]/5 pointer-events-none" />
            <main className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-heading font-black tracking-tight text-[#F3EBD3] uppercase italic">Product <span className="text-[#C9A227]">Vault</span></h1>
            <p className="text-[#A39C86] mt-2 text-sm font-medium">Control subscription packages, pricing, and availability</p>
          </div>
          <button 
            onClick={() => {
              if (showCreateForm) resetForm();
              else setShowCreateForm(true);
            }} 
            className="px-6 py-3 bg-[#C9A227] text-black rounded-2xl hover:bg-[#B8922A] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 active:scale-95"
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? "Cancel" : "Create Product"}
          </button>
        </div>

        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#141414] border border-[#2E2A1E] p-8 rounded-[40px] shadow-[0_20px_50px_rgba(201,162,39,0.06)] mb-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C9A227]" />
              <h2 className="text-xl font-heading font-black text-[#F3EBD3] mb-6 uppercase flex items-center gap-2">
                {editingId ? "Modify" : "Deploy"} <span className="text-[#C9A227]">Package</span>
              </h2>
              <form onSubmit={editingId ? handleUpdate : handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Product Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 90-Day VIP Access"
                    className="bg-[#141414] border border-[#2E2A1E] px-4 py-3 rounded-2xl w-full text-[#F3EBD3] focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] outline-none transition-all font-medium shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Duration (Days)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      required
                      type="number"
                      value={formData.duration_days}
                      onChange={e => setFormData({ ...formData, duration_days: e.target.value })}
                      placeholder="90"
                      className="bg-background border border-border pl-12 pr-4 py-3 rounded-2xl w-full text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Price (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="49.99"
                      className="bg-background border border-border pl-12 pr-4 py-3 rounded-2xl w-full text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Description</label>
                  <input
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief highlight of features..."
                    className="bg-background border border-border px-4 py-3 rounded-2xl w-full text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Template Type</label>
                  <select
                    value={formData.templateType || 'DEFAULT'}
                    onChange={e => {
                      const nextType = e.target.value;
                      if (nextType === 'ECG') {
                        setFormData({ ...formData, templateType: nextType, systems: ECG_SYSTEMS, subjects: ECG_SUBJECTS });
                      } else {
                        setFormData({ ...formData, templateType: nextType });
                      }
                    }}
                    className="bg-background border border-border px-4 py-3 rounded-2xl w-full text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                  >
                    <option value="DEFAULT">DEFAULT</option>
                    <option value="ECG">ECG</option>
                  </select>
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Systems</label>
                    <textarea
                      value={(formData.templateType === 'ECG' ? ECG_SYSTEMS : (formData.systems || [])).join('\n')}
                      readOnly={formData.templateType === 'ECG'}
                      onChange={e => {
                        if (formData.templateType === 'ECG') return;
                        const next = e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                        setFormData({ ...formData, systems: next });
                      }}
                      className="bg-background border border-border px-4 py-3 rounded-2xl w-full text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium h-28"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Subjects</label>
                    <textarea
                      value={(formData.templateType === 'ECG' ? ECG_SUBJECTS : (formData.subjects || [])).join('\n')}
                      readOnly={formData.templateType === 'ECG'}
                      onChange={e => {
                        if (formData.templateType === 'ECG') return;
                        const next = e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                        setFormData({ ...formData, subjects: next });
                      }}
                      className="bg-background border border-border px-4 py-3 rounded-2xl w-full text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium h-28"
                    />
                  </div>
                </div>
                <div className="lg:col-span-3 h-[1px] bg-[#171717] my-2" />

                <div className="lg:col-span-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] ml-1">Additional Pricing Tiers</label>
                    <button 
                      type="button" 
                      onClick={addPlanTier}
                      className="px-4 py-1.5 bg-[#111111] border border-[#2E2A1E] rounded-lg text-[9px] font-black uppercase tracking-widest text-[#F3EBD3] hover:bg-[#D4AF37] hover:text-white transition-all shadow-sm"
                    >
                      + Add Tier
                    </button>
                  </div>
                  
                  {formData.plans.length === 0 ? (
                    <div className="bg-[#111111] border-2 border-dashed border-[#2E2A1E] rounded-3xl p-6 text-center">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No extra tiers defined for this stream</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.plans.map((plan, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-[#111111] border border-[#2E2A1E] p-4 rounded-[24px] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex-1 space-y-2">
                             <div className="relative">
                               <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                 type="number" 
                                 placeholder="Days"
                                 value={plan.days}
                                 onChange={e => updatePlanTier(idx, 'days', e.target.value)}
                                 className="w-full bg-[#141414] border border-[#2E2A1E] pl-10 pr-4 py-2 rounded-xl text-xs font-bold focus:ring-4 focus:ring-[#D4AF37]/5 outline-none"
                               />
                             </div>
                          </div>
                          <div className="flex-1 space-y-2">
                             <div className="relative">
                               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                 type="number" 
                                 placeholder="Price"
                                 value={plan.price}
                                 onChange={e => updatePlanTier(idx, 'price', e.target.value)}
                                 className="w-full bg-[#141414] border border-[#2E2A1E] pl-10 pr-4 py-2 rounded-xl text-xs font-bold focus:ring-4 focus:ring-[#D4AF37]/5 outline-none"
                               />
                             </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removePlanTier(idx)}
                            className="p-3 bg-[#141414] border border-[#2E2A1E] text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3 h-[1px] bg-[#171717] my-4" />

                <div className="lg:col-span-3 space-y-4">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] ml-1">Testing Configuration</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-[#111111]/30 p-6 rounded-[32px] border border-[#1F1F1F]/50">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Block Size</label>
                      <input 
                        type="number"
                        value={formData.defaultCreateTestConfig.blockSize}
                        onChange={e => setFormData({
                          ...formData,
                          defaultCreateTestConfig: { ...formData.defaultCreateTestConfig, blockSize: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full bg-[#141414] border border-[#2E2A1E] px-4 py-2.5 rounded-xl text-xs font-bold focus:ring-4 focus:ring-[#D4AF37]/5 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Negative Marking</label>
                       <div className="flex items-center gap-3 h-[42px] px-3 bg-[#141414] rounded-xl border border-[#2E2A1E]">
                          <input 
                            type="checkbox"
                            checked={formData.defaultCreateTestConfig.negativeMarking}
                            onChange={e => setFormData({
                              ...formData,
                              defaultCreateTestConfig: { ...formData.defaultCreateTestConfig, negativeMarking: e.target.checked }
                            })}
                            className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37]/20"
                          />
                          <span className="text-[10px] font-bold text-[#B8B09A] uppercase tracking-wider">Enabled</span>
                       </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Columns</label>
                      <input 
                        type="text"
                        placeholder="system, tags"
                        value={formData.defaultCreateTestConfig.columns.join(', ')}
                        onChange={e => setFormData({
                          ...formData,
                          defaultCreateTestConfig: { ...formData.defaultCreateTestConfig, columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                        })}
                        className="w-full bg-[#141414] border border-[#2E2A1E] px-4 py-2.5 rounded-xl text-xs font-bold focus:ring-4 focus:ring-[#D4AF37]/5 outline-none"
                      />
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest ml-1">Comma-separated: system, tags, etc.</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 flex flex-col justify-end mt-4">
                  <div className="flex items-center gap-6 h-[60px]">
                    <label className="flex items-center gap-4 cursor-pointer group shrink-0">
                      <div className={`w-14 h-8 rounded-full p-1.5 transition-all duration-500 shadow-inner ${formData.is_published ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-[#1F1F1F]'}`}>
                        <div className={`w-5 h-5 bg-[#141414] rounded-full transition-all duration-500 shadow-md ${formData.is_published ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                      <span className={`text-[12px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${formData.is_published ? 'text-emerald-600 scale-105' : 'text-slate-400'}`}>
                        {formData.is_published ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                      <input type="checkbox" className="hidden" checked={formData.is_published} onChange={e => setFormData({ ...formData, is_published: e.target.checked })} />
                    </label>
                    <button type="submit" className={`flex-1 rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl h-full active:scale-95 group relative overflow-hidden ${
                      formData.is_published 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                        : 'bg-[#D4AF37] hover:bg-[#B8922A] text-black shadow-[#D4AF37]/20'
                    }`}>
                       <span className="relative z-10">{editingId ? "Update Product" : (formData.is_published ? "Launch Live" : "Sync Archive")}</span>
                       <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List UI */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center mb-4">
             <button
              onClick={() => handleBulkToggleVisibility(true)}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <ShieldCheck size={14} /> Bulk Publish
            </button>
            <button
               onClick={() => handleBulkToggleVisibility(false)}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <ShieldAlert size={14} /> Bulk Draft
            </button>
            {selectedIds.size > 0 && (
              <span className="ml-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
                {selectedIds.size} STREAMS CAPTURED
              </span>
            )}
          </div>

          {/* Standard QBank Management Card */}
          <div className="bg-[#141414] border border-[#2E2A1E] p-6 rounded-[32px] mb-8 flex flex-col md:flex-row items-center justify-between shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#111111] rounded-full translate-x-10 translate-y-[-10px] opacity-50 group-hover:scale-110 transition-transform" />
             
             <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-[#2E2A1E] flex items-center justify-center text-slate-400">
                   <Database size={24} />
                </div>
                <div>
                   <h3 className="text-xl font-heading font-black text-[#EAE2C8]">Standard QBank</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Universal Question Repository (Legacy)</p>
                </div>
             </div>

             <div className="flex items-center gap-3 mt-4 md:mt-0 relative z-10">
                <button 
                  onClick={() => router.push('/author/manage-questions')}
                  className="px-5 py-3 rounded-xl bg-[#141414] border border-[#2E2A1E] text-[#B8B09A] hover:text-[#C9A227] hover:border-[#C9A227]/30 font-bold text-[11px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                   <Database size={16} /> Manage Pool
                </button>
                <button 
                  onClick={() => router.push('/author/create-question')}
                  className="px-5 py-3 rounded-xl bg-[#C9A227] text-black font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-[#C9A227]/20 hover:bg-[#B8922A] transition-all flex items-center gap-2"
                >
                   <Plus size={16} /> Add Item
                </button>
             </div>
          </div>

          <div className="overflow-hidden bg-card rounded-[32px] border border-border shadow-2xl shadow-primary/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-panel/30">
                  <th className="px-8 py-5 w-16">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                      checked={products.length > 0 && selectedIds.size === products.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Product Detail</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Terms</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pricing</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">Uplinking_To_Catalog...</p>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                   <tr>
                    <td colSpan="6" className="py-20 text-center text-muted-foreground opacity-50 uppercase tracking-[0.3em] font-mono text-xs">
                      No Products Found in Database
                    </td>
                  </tr>
                ) : products.map((product) => {
                  // Ensure plans is an array for mapping (defense-in-depth)
                  const plans = Array.isArray(product.plans) 
                    ? product.plans 
                    : (typeof product.plans === 'string' ? JSON.parse(product.plans || '[]') : []);
                  
                  return (
                    <tr key={product.id} className="hover:bg-panel/20 transition-all group">
                    <td className="px-8 py-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push(`/author/manage-products/${product.id}`)}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <Package size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors underline decoration-transparent group-hover:decoration-primary/30 underline-offset-4">{product.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase truncate max-w-[200px]">{product.description || 'Secure Educational Stream'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1.5">
                          <span className="bg-panel px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-border w-fit">
                            {product.duration_days} DAYS
                          </span>
                          {plans.map((p, i) => (
                            <span key={i} className="bg-[#D4AF37]/5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight border border-[#D4AF37]/10 text-[#D4AF37] w-fit">
                              {p.days} DAYS
                            </span>
                          ))}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1.5">
                          <div className="text-sm font-black text-[#F3EBD3]">${(Number(product.price) || 0).toFixed(2)}</div>
                          {plans.map((p, i) => (
                            <div key={i} className="text-[10px] font-bold text-slate-400">${parseFloat(p.price || 0).toFixed(2)}</div>
                          ))}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.is_published ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${product.is_published ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {product.is_published ? 'LIVE' : 'HIDDEN'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleVisibility(product)}
                          className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${product.is_published ? 'bg-panel border-border hover:bg-amber-500 hover:text-black' : 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-emerald-500 hover:text-black'}`}
                          title={product.is_published ? 'Hide this product from students' : 'Show this product to students'}
                        >
                          {product.is_published ? <EyeOff size={14} /> : <Eye size={14} />} {product.is_published ? 'Hide' : 'Show'}
                        </button>
                        <button 
                          onClick={() => router.push(`/author/manage-questions?packageId=${product.id}`)}
                          className="p-2.5 rounded-xl bg-[#C9A227]/10 text-[#C9A227] hover:bg-[#C9A227] hover:text-white transition-all border border-[#C9A227]/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4"
                          title="Manage Questions for this Package"
                        >
                          <Database size={14} /> Questions
                        </button>
                        <button 
                          onClick={() => router.push(`/author/create-question?packageId=${product.id}`)}
                          className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4"
                          title="Create Question for this Package"
                        >
                          <Plus size={14} /> Create
                        </button>
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2.5 rounded-xl bg-panel hover:bg-primary hover:text-white transition-all border border-border"
                          title="Edit Product"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2.5 rounded-xl bg-panel hover:bg-red-500 hover:text-white transition-all border border-border"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
