"use client";

import React, { useRef } from "react";
import { countWords, imageSizeClass, useAutoResizeTextarea } from "@/hooks/author/useQuestionEditor";
import InteractiveText from "@/components/shared/InteractiveText";

export default function StemEditor({ editor }) {
  const {
    stem, setStem, errors, handleTextareaChange,
    handleKeyDownSuggested, stemImage, setStemImage, handleImageChange,
    insertHighlightImage, removeHighlight
  } = editor;

  const stemTextareaRef = useRef(null);
  const stemRef = useAutoResizeTextarea(stem);

  return (
    <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_15px_40px_rgba(0,0,94,0.04)] space-y-2">
      <div className="flex justify-between items-center ml-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0066CC] font-mono block">Question Content</span>
        <div className="flex items-center gap-3">
          <button
            onClick={insertHighlightImage(setStem, stemTextareaRef, stem, setStemImage, stemImage)}
            className="text-[10px] font-black uppercase tracking-widest text-[#0066CC] hover:text-[#0055AA] transition-colors flex items-center gap-1"
            title="Highlight a word and show an image when clicked"
          >
            <span className="text-sm">+</span> Add Highlight
          </button>
          <button
            onClick={removeHighlight(setStem, stem)}
            className="text-muted-foreground hover:text-red-500 transition-colors"
            title="Remove all highlight tags from this text"
          >
            <svg xmlns="http://www.w3.org/2001/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
          </button>
        </div>
      </div>
      <textarea
        ref={(el) => {
          stemRef.current = el;
          stemTextareaRef.current = el;
        }}
        value={stem}
        onChange={handleTextareaChange(setStem, "stem")}
        onKeyDown={(e) => handleKeyDownSuggested(e, setStem, stemTextareaRef)}
        placeholder="Type question stem here... Use [ to trigger auto-suggest"
        className={`bg-[#FDFDFD] text-[#1B263B] border border-slate-200 p-3 rounded-lg w-full resize-none min-h-[100px] text-sm font-medium focus:ring-8 focus:ring-[#0066CC]/5 focus:border-[#0066CC] outline-none transition-all ${errors.stem ? "border-red-500" : ""}`}
      />
      {stem.includes('|') && (
        <div className="p-3 bg-zinc-50 rounded-lg border border-dashed border-zinc-300">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Interactive Preview</span>
          <InteractiveText text={stem} sectionImage={stemImage.data} gallery={editor.gallery} className="text-sm" />
        </div>
      )}

      {stemImage.data && (
        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Section Image Settings</span>
              <div className="flex items-center gap-2">
                <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  {['small', 'medium', 'large', 'default'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStemImage({ ...stemImage, size: s })}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${stemImage.size === s ? 'bg-primary text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                      {s === 'default' ? 'DEF' : s.substring(0, 1)}
                    </button>
                  ))}
                </div>
                <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  {[{ key: 'top', label: 'TOP' }, { key: 'bottom', label: 'BTM' }, { key: 'inline', label: 'INL' }].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setStemImage({ ...stemImage, placement: p.key })}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${stemImage.placement === p.key ? 'bg-[#0072bc] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStemImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
              className="h-8 px-4 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
            >
              Remove Image
            </button>
          </div>
          <div className="relative group inline-block p-2 bg-white dark:bg-black/20 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <img src={stemImage.data} alt="stem" className={`${imageSizeClass(stemImage.size)} rounded-lg`} />
            <button
              onClick={() => setStemImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
              className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-90 transition-opacity border-2 border-white dark:border-zinc-800 hover:opacity-100"
              title="Remove this image"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
