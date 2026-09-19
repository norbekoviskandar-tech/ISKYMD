"use client";

import React from "react";
import { imageSizeClass } from "@/hooks/author/useQuestionEditor";

export default function GalleryEditor({ editor }) {
  const { gallery, removeGalleryItem, updateGalleryItem } = editor;

  const galleryIds = Object.keys(gallery || {});

  if (galleryIds.length === 0) return null;

  return (
    <section className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono block ml-1">
          Interactive Asset Gallery ({galleryIds.length})
        </span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {galleryIds.map((id) => {
          const item = gallery[id];
          const isInteractive = item.variant === 'interactive';
          
          return (
            <div key={id} className="p-1.5 bg-[#141414] dark:bg-zinc-900 border border-[#2E2A1E] dark:border-zinc-800 rounded-lg shadow-sm space-y-1.5 relative group transition-all">
              <div className="flex flex-col gap-1">
                {/* Size Controls */}
                <div className="flex bg-[#111111] dark:bg-zinc-800 rounded p-0.5 border border-[#1F1F1F] dark:border-zinc-700 w-full">
                  {['small', 'medium', 'large', 'default'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateGalleryItem(id, { size: s })}
                      className={`flex-1 py-0.5 text-[7px] font-bold uppercase rounded-sm transition-all ${item.size === s ? 'bg-primary text-white' : 'text-zinc-400 hover:text-[#A39C86]'}`}
                      title={`Size: ${s}`}
                    >
                      {s === 'default' ? 'DEF' : s.substring(0, 1)}
                    </button>
                  ))}
                </div>

                {/* Placement Controls */}
                {!isInteractive && (
                  <div className="flex bg-[#111111] dark:bg-zinc-800 rounded p-0.5 border border-[#1F1F1F] dark:border-zinc-700 w-full">
                    {[
                      { key: 'top', label: 'T' },
                      { key: 'bottom', label: 'B' },
                      { key: 'inline', label: 'I' }
                    ].map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => updateGalleryItem(id, { placement: p.key })}
                        className={`flex-1 py-0.5 text-[7px] font-bold uppercase rounded-sm transition-all ${item.placement === p.key ? 'bg-[#C9A227] text-black' : 'text-zinc-400 hover:text-[#A39C86]'}`}
                        title={`Placement: ${p.key}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative aspect-square flex items-center justify-center bg-[#111111] dark:bg-zinc-950 rounded border border-[#1F1F1F] dark:border-zinc-800 overflow-hidden">
                <img 
                  src={item.data} 
                  alt="" 
                  loading="lazy"
                  className="max-h-full max-w-full object-contain" 
                />
                
                <button
                  type="button"
                  onClick={() => removeGalleryItem(id)}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  ×
                </button>
              </div>

              <div className="text-[7px] font-mono text-zinc-400 truncate text-center">
                {id.slice(-6)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
