"use client";

import React from "react";

export default function MetadataPanel({ editor }) {
  const {
    isEditing, lastSaved, questionId, setQuestionId, errors, generateAutoId,
    system, setSystem, availableSystems, subject, setSubject, availableSubjects,
    topic, setTopic, correctIndex, setCorrectIndex, tags, setTags,
    references, setReferences, saveQuestion, resetForm,
    status, version, choices
  } = editor;

  return (
    <div className="bg-[#141414] text-[#F3EBD3] p-3 rounded-xl border border-[#2E2A1E] shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-3 h-fit sticky top-20">
      <div>
        <h2 className="text-xl font-heading font-black text-[#F3EBD3] uppercase tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[#D4AF37] rounded-full" />
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
            status === 'published' ? 'bg-emerald-100 text-emerald-700' : 
            status === 'draft' ? 'bg-amber-100 text-amber-700' : 
            status === 'review' ? 'bg-[#241F10] text-[#B8922A]' :
            status === 'approved' ? 'bg-[#241F10] text-[#B8922A]' :
            status === 'deprecated' ? 'bg-red-100 text-red-700' :
            'bg-[#171717] text-[#B8B09A]'
          }`}>
            {status || 'Draft'} v{version || 1}
          </span>
          {lastSaved && (
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">
              Saved: {new Date(lastSaved).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Question ID</label>
          <input
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value.toUpperCase())}
            placeholder="e.g. CV-HTN-001"
            className={`bg-[#141414] border border-[#2E2A1E] px-4 py-3 rounded-2xl w-full text-[#F3EBD3] focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] outline-none transition-all shadow-sm ${errors.questionId ? "border-red-500" : ""}`}
            disabled={isEditing}
          />
          {errors.questionId && <p className="text-red-600 text-[10px] font-bold mt-1.5 ml-1">{errors.questionId}</p>}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={generateAutoId}
            className="mt-6 px-4 py-3 bg-primary text-white rounded-2xl hover:opacity-90 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
          >
            Auto
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-bold text-[#A39C86] uppercase block mb-0.5 ml-1">System</label>
          <select 
            value={system} 
            onChange={(e) => setSystem(e.target.value)} 
            className={`bg-background text-foreground border border-border p-1.5 w-full rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all hover:bg-panel/30 text-xs ${errors.system ? "border-red-500" : ""}`}
          >
            <option value="">Select System</option>
            {availableSystems.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.system && <p className="text-red-600 text-[10px] mt-0.5">{errors.system}</p>}
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#A39C86] uppercase block mb-0.5 ml-1">Subject</label>
          <select 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
            className={`bg-background text-foreground border border-border p-1.5 w-full rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all hover:bg-panel/30 text-xs ${errors.subject ? "border-red-500" : ""}`}
          >
            <option value="">Select Subject</option>
            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.subject && <p className="text-red-600 text-[10px] mt-0.5">{errors.subject}</p>}
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#A39C86] uppercase block mb-0.5 ml-1">Topic</label>
          <input 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)} 
            placeholder="Topic" 
            className="bg-background text-foreground border border-border p-1.5 rounded-lg w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all hover:bg-panel/30 text-xs" 
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#A39C86] uppercase block mb-0.5 ml-1">Correct Answer</label>
          <select 
            value={correctIndex} 
            onChange={(e) => setCorrectIndex(parseInt(e.target.value))} 
            className="bg-background text-foreground border border-border p-1.5 rounded-lg w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all hover:bg-panel/30 text-xs text-center font-bold"
          >
            {choices.map((_, i) => (
              <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2">
        <label className="text-[10px] font-bold text-[#A39C86] uppercase tracking-widest block mb-0.5 ml-1">Tags</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="heart, surgery, pediatric" className="bg-background border border-border p-1.5 rounded-lg w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs" />
      </div>

      <div className="mt-2">
        <label className="text-[10px] font-bold text-[#A39C86] uppercase tracking-widest block mb-0.5 ml-1">References</label>
        <textarea value={references} onChange={(e) => setReferences(e.target.value)} placeholder="Guidelines, Citations..." className="bg-background border border-border p-1.5 rounded-lg w-full h-14 resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all text-[10px]" />
      </div>

      <div className="flex flex-col gap-2 mt-4">
                <button 
          type="button"
          onClick={() => saveQuestion(true)}
          className="w-full bg-[#D4AF37] text-black p-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 hover:bg-[#B8922A] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
          <div className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-pulse" />
          {status === 'published' ? 'Update Published' : 'Publish Live'}
                </button>
                
                <button 
          type="button"
          onClick={() => saveQuestion(false)}
          className="w-full bg-[#141414] text-[#F3EBD3] p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#2E2A1E]/10 hover:border-[#2E2A1E]/30 hover:bg-[#111111] transition-all active:scale-95 shadow-sm"
                >
          Save Draft
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm("Clear entire form? This cannot be undone.")) {
              resetForm();
            }
          }}
          className="w-full mt-2 text-red-500 hover:bg-red-50 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Reset Workboard
        </button>
      </div>
    </div>
  );
}
