"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export default function InteractiveText({ text, sectionImage = null, gallery = {}, className = "" }) {
  const [activeImage, setActiveImage] = useState(null);

  if (!text) return null;

  // Regex to match [word|image:...] OR just [image:...]
  const topImages = [];
  const bottomImages = [];
  const inlineContent = [];

  let lastIndex = 0;
  // Optional group for word and pipe: (?:([^|\]]+)\|)?
  const regex = /\[(?:([^|\]]+)\|)?(image(?::([^\]]+))?)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      inlineContent.push(text.substring(lastIndex, match.index));
    }

    const word = match[1]; // may be undefined for [image:id]
    const imageData = match[3]; // only exists if "image:id"

    // Resolve target image and its size/placement metadata
    let targetImage = null;
    let targetSize = "default";
    let targetPlacement = "inline"; // default for inline auto-show

    if (imageData) {
       if (imageData.startsWith("data:")) {
         targetImage = imageData;
       } else if (gallery && typeof gallery === 'object' && gallery[imageData]) {
         const galleryItem = gallery[imageData];
         targetImage = typeof galleryItem === 'object' ? galleryItem.data : galleryItem;
         targetSize = typeof galleryItem === 'object' ? galleryItem.size : "default";
         targetPlacement = typeof galleryItem === 'object' ? galleryItem.placement : "bottom";
       }
    } else {
      targetImage = sectionImage;
    }

    if (word) {
      // Interactive span behavior (Pop-up modal always shows high-res, but word indicates it)
      inlineContent.push(
        <span
          key={match.index}
          className={`text-[#0072bc] dark:text-blue-400 font-bold underline decoration-dotted underline-offset-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors px-1 rounded ${!targetImage ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (targetImage) {
              setActiveImage({ word, data: targetImage });
            }
          }}
        >
          {word}
        </span>
      );
    } else if (targetImage) {
      // Auto-show behavior (direct image block with size styling)
      const sizeClass = targetSize === 'small' ? 'max-w-[240px]' :
                        targetSize === 'medium' ? 'max-w-[480px]' :
                        targetSize === 'large' ? 'max-w-[720px]' : 'max-w-full';

      const imgElement = (
        <div key={match.index} className={`my-4 flex justify-center w-full ${targetPlacement === 'top' || targetPlacement === 'bottom' ? 'py-4' : ''}`}>
            <img
               src={targetImage}
               alt="Auto-show"
               loading="lazy"
               className={`${sizeClass} h-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-zoom-in hover:shadow-md transition-all`}
               onClick={() => setActiveImage({ word: "Viewing Image", data: targetImage })}
            />
        </div>
      );

      // Hoist if top/bottom, otherwise inline
      if (targetPlacement === 'top') {
         topImages.push(imgElement);
      } else if (targetPlacement === 'bottom') {
         bottomImages.push(imgElement);
      } else {
         inlineContent.push(imgElement);
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    inlineContent.push(text.substring(lastIndex));
  }

  return (
    <div className={className}>
      {topImages.length > 0 && <div className="mb-4 space-y-4">{topImages}</div>}
      <div className="whitespace-pre-wrap">{inlineContent}</div>
      {bottomImages.length > 0 && <div className="mt-4 space-y-4">{bottomImages}</div>}

      {activeImage && (
        <div 
          className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveImage(null)}
        >
          <div 
            className="relative bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">{activeImage.word}</h3>
              <button 
                onClick={() => setActiveImage(null)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-zinc-50 dark:bg-black/20">
              <img 
                src={activeImage.data} 
                alt={activeImage.word} 
                loading="lazy"
                className="max-h-[70vh] rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
