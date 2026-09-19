"use client";

import React, { useRef } from "react";
import { countWords, imageSizeClass, useAutoResizeTextarea } from "@/hooks/author/useQuestionEditor";
import InteractiveText from "@/components/shared/InteractiveText";

export default function ExplanationEditor({ editor }) {
  const {
    explanationCorrect, setExplanationCorrect, explanationCorrectImage, setExplanationCorrectImage,
    explanationWrong, setExplanationWrong, explanationWrongImage, setExplanationWrongImage,
    summary, setSummary, summaryImage, setSummaryImage,
    handleTextareaChange, handleKeyDownSuggested, handleImageChange,
    insertHighlightImage, removeHighlight
  } = editor;

  const expCorrectTextareaRef = useRef(null);
  const expWrongTextareaRef = useRef(null);
  const summaryTextareaRef = useRef(null);

  const expCorrectRef = useAutoResizeTextarea(explanationCorrect);
  const expWrongRef = useAutoResizeTextarea(explanationWrong);
  const summaryRef = useAutoResizeTextarea(summary);

  return (
    <section className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono block ml-1">Rationale & Analysis</span>

      {/* Correct Rationale */}
      <div className="space-y-4">
        <div className="flex justify-between items-center ml-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 font-mono block">Correct Rationale</label>
          <div className="flex items-center gap-3">
            <button
              onClick={insertHighlightImage(setExplanationCorrect, expCorrectTextareaRef, explanationCorrect, setExplanationCorrectImage, explanationCorrectImage)}
              className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
              title="Highlight text to add interactive image, or click without selection to add section image"
            >
              <span className="text-sm">+</span> Highlight
            </button>
            <button
              onClick={removeHighlight(setExplanationCorrect, explanationCorrect)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
              title="Remove all highlight tags from this text"
            >
              <svg xmlns="http://www.w3.org/2001/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
        <textarea
          ref={(el) => {
            expCorrectRef.current = el;
            expCorrectTextareaRef.current = el;
          }}
          value={explanationCorrect}
          onChange={handleTextareaChange(setExplanationCorrect, "correct")}
          onKeyDown={(e) => handleKeyDownSuggested(e, setExplanationCorrect, expCorrectTextareaRef)}
          placeholder="Explain why the correct answer is right..."
          className="bg-background text-foreground border border-border p-5 rounded-2xl w-full resize-none min-h-[160px] focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium focus:border-primary/20"
        />
        {explanationCorrect.includes('|') && (
          <div className="p-3 bg-emerald-50/50 rounded-lg border border-dashed border-emerald-200">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-2">Interactive Preview</span>
            <InteractiveText text={explanationCorrect} sectionImage={explanationCorrectImage.data} gallery={editor.gallery} className="text-sm" />
          </div>
        )}
        {explanationCorrectImage.data && (
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Image Settings</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {['small', 'medium', 'large', 'default'].map(s => (
                      <button
                        key={s}
                        onClick={() => setExplanationCorrectImage({ ...explanationCorrectImage, size: s })}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${explanationCorrectImage.size === s ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-400 hover:text-emerald-600'}`}
                      >
                        {s === 'default' ? 'DEF' : s.substring(0, 1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {[{ key: 'top', label: 'TOP' }, { key: 'bottom', label: 'BTM' }, { key: 'inline', label: 'INL' }].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setExplanationCorrectImage({ ...explanationCorrectImage, placement: p.key })}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${explanationCorrectImage.placement === p.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-emerald-600'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExplanationCorrectImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
                className="h-8 px-4 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                Remove
              </button>
            </div>
            <div className="relative group inline-block p-2 bg-white dark:bg-black/20 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <img src={explanationCorrectImage.data} alt="exp-correct" loading="lazy" className={`${imageSizeClass(explanationCorrectImage.size)} rounded-lg`} />
              <button
                onClick={() => setExplanationCorrectImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
                className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-90 transition-all border-2 border-white dark:border-zinc-800 hover:opacity-100"
                title="Remove this image"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Distractor Analysis */}
      <div className="space-y-3">
        <div className="flex justify-between items-center ml-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 font-mono block">Distractor Analysis</label>
          <div className="flex items-center gap-3">
            <button
              onClick={insertHighlightImage(setExplanationWrong, expWrongTextareaRef, explanationWrong, setExplanationWrongImage, explanationWrongImage)}
              className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
            >
              <span className="text-sm">+</span> Highlight
            </button>
            <button
              onClick={removeHighlight(setExplanationWrong, explanationWrong)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2001/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
        <textarea
          ref={(el) => {
            expWrongRef.current = el;
            expWrongTextareaRef.current = el;
          }}
          value={explanationWrong}
          onChange={handleTextareaChange(setExplanationWrong, "wrong")}
          onKeyDown={(e) => handleKeyDownSuggested(e, setExplanationWrong, expWrongTextareaRef)}
          placeholder="Explain why other choices are incorrect..."
          className="bg-background text-foreground border border-border p-4 rounded-xl w-full resize-none min-h-[80px] focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium focus:border-primary/20 text-sm"
        />
        {explanationWrong.includes('|') && (
          <div className="p-3 bg-amber-50/50 rounded-lg border border-dashed border-amber-200">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-2">Interactive Preview</span>
            <InteractiveText text={explanationWrong} sectionImage={explanationWrongImage.data} gallery={editor.gallery} className="text-sm" />
          </div>
        )}
        {explanationWrongImage.data && (
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block mb-1">Image Settings</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {['small', 'medium', 'large', 'default'].map(s => (
                      <button
                        key={s}
                        onClick={() => setExplanationWrongImage({ ...explanationWrongImage, size: s })}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${explanationWrongImage.size === s ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-400 hover:text-amber-600'}`}
                      >
                        {s === 'default' ? 'DEF' : s.substring(0, 1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {[{ key: 'top', label: 'TOP' }, { key: 'bottom', label: 'BTM' }, { key: 'inline', label: 'INL' }].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setExplanationWrongImage({ ...explanationWrongImage, placement: p.key })}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${explanationWrongImage.placement === p.key ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-amber-600'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExplanationWrongImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
                className="h-8 px-4 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                Remove
              </button>
            </div>
            <div className="relative group inline-block p-2 bg-white dark:bg-black/20 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <img src={explanationWrongImage.data} alt="exp-wrong" loading="lazy" className={`${imageSizeClass(explanationWrongImage.size)} rounded-lg`} />
              <button
                onClick={() => setExplanationWrongImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
                className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-90 transition-all border-2 border-white dark:border-zinc-800 hover:opacity-100"
                title="Remove this image"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex justify-between items-center ml-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0066CC] font-mono block">Key Summary</label>
          <div className="flex items-center gap-3">
            <button
              onClick={insertHighlightImage(setSummary, summaryTextareaRef, summary, setSummaryImage, summaryImage)}
              className="text-[10px] font-black uppercase tracking-widest text-[#0066CC] hover:text-[#0055AA] transition-colors flex items-center gap-1"
            >
              <span className="text-sm">+</span> Highlight
            </button>
            <button
              onClick={removeHighlight(setSummary, summary)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2001/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
        <textarea
          ref={(el) => {
            summaryRef.current = el;
            summaryTextareaRef.current = el;
          }}
          value={summary}
          onChange={handleTextareaChange(setSummary, "summary")}
          onKeyDown={(e) => handleKeyDownSuggested(e, setSummary, summaryTextareaRef)}
          placeholder="Brief educational objective..."
          className="bg-background text-foreground border border-border p-4 rounded-xl w-full resize-none min-h-[60px] focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium focus:border-primary/20 text-sm italic"
        />
        {summary.includes('|') && (
          <div className="p-3 bg-blue-50/50 rounded-lg border border-dashed border-blue-200">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 block mb-2">Interactive Preview</span>
            <InteractiveText text={summary} sectionImage={summaryImage.data} gallery={editor.gallery} className="text-sm" />
          </div>
        )}
        {summaryImage.data && (
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 block mb-1">Image Settings</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {['small', 'medium', 'large', 'default'].map(s => (
                      <button
                        key={s}
                        onClick={() => setSummaryImage({ ...summaryImage, size: s })}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${summaryImage.size === s ? 'bg-blue-500 text-white shadow-sm' : 'text-zinc-400 hover:text-blue-600'}`}
                      >
                        {s === 'default' ? 'DEF' : s.substring(0, 1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {[{ key: 'top', label: 'TOP' }, { key: 'bottom', label: 'BTM' }, { key: 'inline', label: 'INL' }].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setSummaryImage({ ...summaryImage, placement: p.key })}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${summaryImage.placement === p.key ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-blue-600'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSummaryImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
                className="h-8 px-4 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                Remove
              </button>
            </div>
            <div className="relative group inline-block p-2 bg-white dark:bg-black/20 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <img src={summaryImage.data} alt="summary" loading="lazy" className={`${imageSizeClass(summaryImage.size)} rounded-lg`} />
              <button
                onClick={() => setSummaryImage({ data: "", size: "default", fileName: "", placement: "bottom" })}
                className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-90 transition-all border-2 border-white dark:border-zinc-800 hover:opacity-100"
                title="Remove this image"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
