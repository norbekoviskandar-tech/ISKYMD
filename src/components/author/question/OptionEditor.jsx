"use client";

import React, { useRef } from "react";
import { imageSizeClass } from "@/hooks/author/useQuestionEditor";
import InteractiveText from "@/components/shared/InteractiveText";

export default function OptionEditor({ editor }) {
  const {
    choices, setChoices, errors, handleImageChange, insertHighlightImage, removeHighlight, correctIndex, setCorrectIndex, addChoice, removeChoice,
    matrixColumns, addMatrixColumn, removeMatrixColumn, updateMatrixColumn, updateChoiceMatrixValue,
    matrixPlacement, setMatrixPlacement,
    hideOptionText, setHideOptionText
  } = editor;

  // Dynamic Ref management
  const choiceRefs = useRef([]);
  if (choiceRefs.current.length !== choices.length) {
    choiceRefs.current = Array(choices.length).fill().map((_, i) => choiceRefs.current[i] || React.createRef());
  }

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleChoiceImageRemove = (choiceIndex) => {
    const next = [...choices];
    next[choiceIndex].image = { data: "", size: "default", fileName: "", placement: "bottom" };
    setChoices(next);
  };

  // Header Column for Option Text
  const OptionHeader = (
    <div className={`relative group flex flex-col items-center gap-1 flex-1 ${hideOptionText ? 'hidden' : ''}`}>
      <button
        onClick={() => setHideOptionText(true)}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
        title="Hide and convert to split column"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
      </button>
      <div className="relative w-full group/inner">
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg px-2 py-2 text-[11px] font-black uppercase tracking-wider text-primary text-center w-full min-h-[38px] flex items-center justify-center">
          Option Content
        </div>
        <button
          onClick={addMatrixColumn}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-primary text-white rounded-full p-1 opacity-0 group-hover/inner:opacity-100 transition-all shadow-lg z-20 hover:scale-110 active:scale-95"
          title="Divide column"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>
  );

  return (
    <section className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4 transition-all duration-300">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono block">Distractors & Options</span>
          <div className="flex items-center gap-2">
            {hideOptionText && (
              <button
                onClick={() => setHideOptionText(false)}
                className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-100 transition-all"
              >
                Restore Option Text Column
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 scale-90">
          <button
            onClick={() => setMatrixPlacement('before')}
            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${matrixPlacement === 'before' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Matrix First
          </button>
          <button
            onClick={() => setMatrixPlacement('after')}
            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${matrixPlacement === 'after' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Text First
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-full space-y-4">
          {/* Matrix Header Row */}
          <div className="flex items-end gap-4 pl-12 pr-4">
            {matrixPlacement === 'after' && OptionHeader}

            {matrixColumns.map((col, idx) => (
              <div key={idx} className="relative group flex flex-col items-center gap-1">
                <button
                  onClick={() => removeMatrixColumn(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
                >
                  <svg xmlns="http://www.w3.org/2001/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
                <div className="flex bg-zinc-50 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700 p-0.5 mb-1 scale-75 origin-bottom opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => updateMatrixColumn(idx, { vertical: !col.vertical })}
                    className="text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-200 transition-colors"
                    title="Toggle between narrow and wide column"
                  >
                    {col.vertical ? 'Wide' : 'Narrow'}
                  </button>
                </div>
                <div className="relative group/col">
                  <textarea
                    value={col.label}
                    onChange={(e) => updateMatrixColumn(idx, { label: e.target.value })}
                    placeholder="Column Name"
                    rows={1}
                    className={`
                      bg-transparent border-none
                      rounded-lg px-2 py-2 text-[14px] font-black pointer-events-none text-center outline-none transition-all resize-x text-zinc-900 dark:text-zinc-200 leading-tight
                      ${col.vertical ? 'w-24 min-h-[80px]' : 'w-40 min-h-[38px]'}
                    `}
                  />
                  <button
                    onClick={addMatrixColumn}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#0072bc] text-white rounded-full p-1 opacity-0 group-hover/col:opacity-100 transition-all shadow-lg z-20 hover:scale-110 active:scale-95"
                    title="Add another piece"
                  >
                    <svg xmlns="http://www.w3.org/2001/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>
              </div>
            ))}

            {matrixPlacement === 'before' && OptionHeader}

            {(matrixColumns.length === 0 || (matrixPlacement === 'after' && hideOptionText)) && (
              <button
                onClick={addMatrixColumn}
                className="self-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg h-[38px] px-3 transition-all border border-dashed border-slate-300 flex items-center gap-2 text-[9px] font-black uppercase"
              >
                <svg xmlns="http://www.w3.org/2001/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Divide Question
              </button>
            )}
          </div>

          {/* CHOICE ROWS */}
          <div className="space-y-2">
            {choices.map((c, i) => (
              <div key={i} className="rounded-lg p-2 bg-panel/10 transition-all hover:bg-panel/20 group">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectIndex(i)}
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center font-black rounded shadow-md text-[12px] font-mono transition-all duration-300 ${correctIndex === i
                      ? 'bg-emerald-500 text-white scale-110 shadow-emerald-200'
                      : 'bg-primary text-white hover:bg-primary/80 opacity-60 hover:opacity-100'
                      }`}
                    title={correctIndex === i ? "This is the correct answer" : `Mark ${String.fromCharCode(65 + i)} as correct`}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>

                  <div className="flex-1 flex gap-4 min-h-[44px]">

                    {matrixPlacement === 'after' && !hideOptionText && (
                      <div className="flex-1 min-h-[38px] flex flex-col justify-center">
                        {c.image.data && c.image.placement === 'top' && (
                          <div className="mb-2 p-3 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 font-sans">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-1.5">
                                <div className="flex bg-zinc-50 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
                                  {['small', 'medium', 'large', 'default'].map(s => (
                                    <button
                                      key={s}
                                      onClick={() => {
                                        const next = [...choices];
                                        next[i].image.size = s;
                                        setChoices(next);
                                      }}
                                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all ${c.image.size === s ? 'bg-primary text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                      {s === 'default' ? 'DEF' : s.substring(0, 1)}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex bg-zinc-50 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
                                  {['top', 'bottom'].map(p => (
                                    <button
                                      key={p}
                                      onClick={() => {
                                        const next = [...choices];
                                        next[i].image.placement = p;
                                        setChoices(next);
                                      }}
                                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all ${c.image.placement === p ? 'bg-[#0072bc] text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                      {p === 'bottom' ? 'BTM' : 'TOP'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleChoiceImageRemove(i)}
                                className="p-1 px-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[9px] font-bold uppercase"
                              >
                                DEL
                              </button>
                            </div>
                            <div className="relative group inline-block border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                              <img src={c.image.data} alt={`choice-${i}`} loading="lazy" className={`${imageSizeClass(c.image.size)}`} />
                              <button
                                onClick={() => handleChoiceImageRemove(i)}
                                className="absolute top-2 right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white dark:border-zinc-800"
                                title="Remove this image"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="relative">
                          <textarea
                            ref={choiceRefs.current[i]}
                            value={c.text}
                            onChange={(e) => {
                              const newChoices = [...choices];
                              newChoices[i].text = e.target.value;
                              setChoices(newChoices);
                            }}
                            onInput={handleTextareaChange}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            rows={1}
                            className={`
                              bg-background text-foreground border border-border px-3 py-1.5 rounded-lg w-full
                              focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium
                              ${errors[`choice${i}`] ? "border-red-500" : "focus:border-primary/20"} pr-16
                              min-h-[38px] overflow-hidden resize-none
                            `}
                          />
                          <div className="absolute right-2 top-2 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const textSetter = (val) => {
                                  const newChoices = [...choices];
                                  newChoices[i].text = val;
                                  setChoices(newChoices);
                                };
                                const imageSetter = (imgObj) => {
                                  const newChoices = [...choices];
                                  newChoices[i].image = imgObj;
                                  setChoices(newChoices);
                                };
                                insertHighlightImage(textSetter, choiceRefs.current[i], c.text, imageSetter, c.image)();
                              }}
                              className="text-[10px] text-primary hover:text-primary-dark font-black uppercase tracking-tighter transition-colors"
                              title="Add highlight or main image"
                            >
                              +Img
                            </button>
                            <button
                              onClick={() => {
                                const setter = (val) => {
                                  const newChoices = [...choices];
                                  newChoices[i].text = val;
                                  setChoices(newChoices);
                                };
                                removeHighlight(setter, c.text)();
                              }}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2001/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                          </div>
                        </div>
                        {c.text.includes('|') && (
                          <div className="px-2 py-1 bg-zinc-50 rounded border border-dashed border-zinc-200">
                            <InteractiveText text={c.text} sectionImage={c.image.data} gallery={editor.gallery} className="text-xs" />
                          </div>
                        )}
                        {errors[`choice${i}`] && <p className="text-red-600 text-[9px] font-bold uppercase ml-1">{errors[`choice${i}`]}</p>}

                        {c.image.data && (c.image.placement === 'bottom' || !c.image.placement) && (
                          <div className="mt-2 p-3 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 font-sans">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-1.5">
                                {['small', 'medium', 'large', 'default'].map(s => (
                                  <button key={s} onClick={() => {
                                    const next = [...choices]; next[i].image.size = s; setChoices(next);
                                  }} className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all ${c.image.size === s ? 'bg-primary text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>{s === 'default' ? 'DEF' : s.substring(0, 1)}</button>
                                ))}
                              </div>
                              <button type="button" onClick={() => handleChoiceImageRemove(i)} className="p-1 px-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[9px] font-bold uppercase">DEL</button>
                            </div>
                            <div className="relative group inline-block border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                              <img src={c.image.data} alt={`choice-${i}`} loading="lazy" className={`${imageSizeClass(c.image.size)}`} />
                              <button
                                onClick={() => handleChoiceImageRemove(i)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all shadow-lg"
                              >
                                <svg xmlns="http://www.w3.org/2001/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {matrixColumns.map((col, colIdx) => (
                      <div key={col.id} className={`flex items-center justify-center ${col.vertical ? 'w-24' : 'w-40'}`}>
                        <input
                          value={c.matrixValues?.[colIdx] || ""}
                          onChange={(e) => updateChoiceMatrixValue(i, colIdx, e.target.value)}
                          className={`
                            bg-transparent border-none
                            rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
                            transition-all h-full min-h-[38px] text-zinc-900 dark:text-zinc-200
                            ${col.vertical ? 'w-24' : 'w-40'}
                          `}
                          placeholder="Val"
                        />
                      </div>
                    ))}

                    {matrixPlacement === 'before' && !hideOptionText && (
                      <div className="flex-1 min-h-[38px] flex flex-col justify-center">
                        {c.image.data && c.image.placement === 'top' && (
                          <div className="mb-2 p-3 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 font-sans">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-1.5">
                                <div className="flex bg-zinc-50 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
                                  {['small', 'medium', 'large', 'default'].map(s => (
                                    <button
                                      key={s}
                                      onClick={() => {
                                        const next = [...choices];
                                        next[i].image.size = s;
                                        setChoices(next);
                                      }}
                                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all ${c.image.size === s ? 'bg-primary text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                      {s === 'default' ? 'DEF' : s.substring(0, 1)}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex bg-zinc-50 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
                                  {['top', 'bottom'].map(p => (
                                    <button
                                      key={p}
                                      onClick={() => {
                                        const next = [...choices];
                                        next[i].image.placement = p;
                                        setChoices(next);
                                      }}
                                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all ${c.image.placement === p ? 'bg-[#0072bc] text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                      {p === 'bottom' ? 'BTM' : 'TOP'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleChoiceImageRemove(i)}
                                className="p-1 px-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[9px] font-bold uppercase"
                              >
                                DEL
                              </button>
                            </div>
                            <div className="relative group inline-block border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                              <img src={c.image.data} alt={`choice-${i}`} loading="lazy" className={`${imageSizeClass(c.image.size)}`} />
                              <button
                                onClick={() => handleChoiceImageRemove(i)}
                                className="absolute top-2 right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white dark:border-zinc-800"
                                title="Remove this image"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="relative">
                          <textarea
                            ref={choiceRefs.current[i]}
                            value={c.text}
                            onChange={(e) => {
                              const newChoices = [...choices];
                              newChoices[i].text = e.target.value;
                              setChoices(newChoices);
                            }}
                            onInput={handleTextareaChange}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            rows={1}
                            className={`
                              bg-background text-foreground border border-border px-3 py-1.5 rounded-lg w-full
                              focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium
                              ${errors[`choice${i}`] ? "border-red-500" : "focus:border-primary/20"} pr-16
                              min-h-[38px] overflow-hidden resize-none
                            `}
                          />
                          <div className="absolute right-2 top-2 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const textSetter = (val) => {
                                  const newChoices = [...choices];
                                  newChoices[i].text = val;
                                  setChoices(newChoices);
                                };
                                const imageSetter = (imgObj) => {
                                  const newChoices = [...choices];
                                  newChoices[i].image = imgObj;
                                  setChoices(newChoices);
                                };
                                insertHighlightImage(textSetter, choiceRefs.current[i], c.text, imageSetter, c.image)();
                              }}
                              className="text-[10px] text-primary hover:text-primary-dark font-black uppercase tracking-tighter transition-colors"
                              title="Add highlight or main image"
                            >
                              +Img
                            </button>
                            <button
                              onClick={() => {
                                const setter = (val) => {
                                  const newChoices = [...choices];
                                  newChoices[i].text = val;
                                  setChoices(newChoices);
                                };
                                removeHighlight(setter, c.text)();
                              }}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2001/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                          </div>
                        </div>
                        {c.text.includes('|') && (
                          <div className="px-2 py-1 bg-zinc-50 rounded border border-dashed border-zinc-200">
                            <InteractiveText text={c.text} sectionImage={c.image.data} gallery={editor.gallery} className="text-xs" />
                          </div>
                        )}
                        {errors[`choice${i}`] && <p className="text-red-600 text-[9px] font-bold uppercase ml-1">{errors[`choice${i}`]}</p>}

                        {c.image.data && (c.image.placement === 'bottom' || !c.image.placement) && (
                          <div className="mt-2 p-3 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 font-sans">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-1.5">
                                {['small', 'medium', 'large', 'default'].map(s => (
                                  <button key={s} onClick={() => {
                                    const next = [...choices]; next[i].image.size = s; setChoices(next);
                                  }} className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all ${c.image.size === s ? 'bg-primary text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>{s === 'default' ? 'DEF' : s.substring(0, 1)}</button>
                                ))}
                              </div>
                              <button type="button" onClick={() => handleChoiceImageRemove(i)} className="p-1 px-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[9px] font-bold uppercase">DEL</button>
                            </div>
                            <div className="relative group inline-block border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                              <img src={c.image.data} alt={`choice-${i}`} loading="lazy" className={`${imageSizeClass(c.image.size)}`} />
                              <button
                                onClick={() => handleChoiceImageRemove(i)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all shadow-lg"
                              >
                                <svg xmlns="http://www.w3.org/2001/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete Option ${String.fromCharCode(65 + i)}?`)) {
                        removeChoice(i);
                      }
                    }}
                    className="mt-1.5 p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Remove this option"
                  >
                    <svg xmlns="http://www.w3.org/2001/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={addChoice}
        className="w-full py-2 bg-[#F8FAFC] border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0066CC] hover:bg-blue-50 hover:border-[#0066CC]/30 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-sm">+</span> Add Extra Choice (Option {String.fromCharCode(65 + choices.length)})
      </button>
    </section>
  );
}
