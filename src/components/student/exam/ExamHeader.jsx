"use client";

import React from "react";
import { 
  Menu, Flag, BarChart2 
} from "lucide-react";
import { useExam } from "@/context/ExamContext";
import { useTimer } from "@/hooks/exam/useTimer";

export default function ExamHeader() {
  const { 
    currentIndex, totalQuestions, currentQuestion, markedQuestions, 
    toggleMark, setShowQuestionList, showQuestionList, mode, elapsedTime,
    isReviewMode, isSubmitted, questions, setElapsedTime, setQuestionDurations,
    modal, isEnding, handleEndBlock
  } = useExam();

  const { formatTime } = useTimer({
    isReviewMode, mode, isSubmitted, questions, currentIndex, totalQuestions,
    setElapsedTime, setQuestionDurations, modalShow: modal.show, isEnding,
    handleAutoEnd: handleEndBlock
  });

  const focusedProduct = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("medbank_focused_product") || '"default"') : null;

  return (
    <header className="bg-[#002b5c] text-white h-[45px] flex items-center px-4 shrink-0 shadow-lg z-50 font-medium relative border-b border-white/10">
      <div className="flex items-center gap-5">
        <div className="flex gap-4">
          <Menu 
            size={18} 
            className="cursor-pointer hover:text-blue-300 transition-colors opacity-70" 
            onClick={() => setShowQuestionList(!showQuestionList)}
          />
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Item ID:</span>
            <span className="text-[14px] font-bold text-white tracking-tight leading-none">{currentQuestion?.id}</span>
          </div>
        </div>
        <div 
          onClick={toggleMark}
          className="flex items-center gap-1.5 cursor-pointer group ml-2 hover:text-orange-400 transition-colors"
        >
          <Flag size={14} className={markedQuestions.has(currentQuestion?.id) ? "fill-orange-500 text-orange-500" : "text-white/50 group-hover:text-white"} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${markedQuestions.has(currentQuestion?.id) ? "text-orange-500" : "text-white/80"}`}>Mark</span>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
           <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">
             {focusedProduct?.name || 'Standard QBank'}
           </span>
        </div>
        <span className="text-[13px] font-bold">
          {currentIndex + 1}/{totalQuestions}
        </span>
      </div>

      <div className="flex items-center gap-5">
<div className="flex items-center gap-2 font-mono text-[16px] font-bold tracking-tight bg-black/20 px-3 py-1 rounded border border-white/5">
          {mode === "timed"
            ? formatTime(Math.max(0, (totalQuestions * 90) - elapsedTime))
            : formatTime(elapsedTime)
          }
        </div>
      </div>
    </header>
  );
}
