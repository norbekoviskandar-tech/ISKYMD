"use client";

import { useState, useRef, useCallback } from "react";
import { ClipboardPaste, X, ChevronDown, ChevronUp, Sparkles, Check, AlertTriangle, Loader2, Trash2, Edit3 } from "lucide-react";

// ─── UUID helper ───────────────────────────────────────────────
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Parser: turns raw pasted text → question objects ──────────

// Metadata-header format parser (System: / Subject: / Topic: / Question Id:)
function parseMetadataFormat(text, defaultSystem, defaultSubject, defaultTopic) {
  const lines = text.split("\n");

  // Split into question blocks by detecting "System:" as boundary
  const blocks = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // A "System:" line signals the start of a new question block
    if (/^System\s*:/i.test(trimmed) && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [];
    }
    currentBlock.push(lines[i]);
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  return blocks.map(block => parseOneMetadataBlock(block, defaultSystem, defaultSubject, defaultTopic)).filter(Boolean);
}

function parseOneMetadataBlock(blockLines, defaultSystem, defaultSubject, defaultTopic) {
  let system = defaultSystem || "";
  let subject = defaultSubject || "";
  let topic = defaultTopic || "";
  let questionId = "";
  let stem = "";
  let choices = [];
  let correct = "";
  let explanationCorrect = "";
  let explanationWrong = "";
  let summary = "";

  // ── State machine ──
  // States: metadata → stem → choices → answer → explanation
  let state = "metadata";

  // Explanation sub-sections
  let expMainParagraphs = [];     // main explanation (for correct answer)
  let expWrongParagraphs = [];    // (Choice X) paragraphs
  let expObjective = [];          // Educational objective

  // Track sub-state inside explanation
  let expSubState = "main"; // main | wrong | objective

  for (let i = 0; i < blockLines.length; i++) {
    const raw = blockLines[i];
    const trimmed = raw.trim();

    // ── METADATA lines ──
    const systemMatch = trimmed.match(/^System\s*:\s*(.*)/i);
    if (systemMatch) { system = systemMatch[1].trim() || defaultSystem || ""; state = "metadata"; continue; }

    const subjectMatch = trimmed.match(/^Subject\s*:\s*(.*)/i);
    if (subjectMatch) { subject = subjectMatch[1].trim() || defaultSubject || ""; state = "metadata"; continue; }

    const topicMatch = trimmed.match(/^Topic\s*:\s*(.*)/i);
    if (topicMatch) { topic = topicMatch[1].trim() || defaultTopic || ""; state = "metadata"; continue; }

    const idMatch = trimmed.match(/^(?:Question\s*)?Id[:\-\s]\s*(.*)/i);
    if (idMatch) { questionId = idMatch[1].trim(); state = "metadata"; continue; }

    // ── Correct answer line ──
    const answerMatch = trimmed.match(/^(?:Correct\s+answer|Answer|Correct|Key|Ans)\s*:\s*([A-Z])/i);
    if (answerMatch) {
      correct = answerMatch[1].toUpperCase();
      state = "answer";
      continue;
    }

    // ── Explanation header ──
    // Matches "Explanation" alone on a line, or "Explanation:" with optional text after
    const expHeaderMatch = trimmed.match(/^(?:Explanation|Rationale|Reason)\s*:?\s*$/i);
    if (expHeaderMatch && (state === "answer" || state === "choices" || choices.length > 0)) {
      state = "explanation";
      expSubState = "main";
      continue;
    }
    // Also match "Explanation:" followed by text on the same line
    const expInlineMatch = trimmed.match(/^(?:Explanation|Rationale|Reason)\s*:\s*(.+)/i);
    if (expInlineMatch && state !== "explanation") {
      state = "explanation";
      expSubState = "main";
      expMainParagraphs.push(expInlineMatch[1].trim());
      continue;
    }

    // ── Choice lines (A. through F.) ──
    const choiceMatch = trimmed.match(/^([A-Z])[.):\-]\s*(.*)/i);
    if (choiceMatch && state !== "explanation") {
      if (state === "metadata" || state === "stem") state = "choices";
      let choiceText = choiceMatch[2] || "";
      let marked = false;
      if (/\s*[\*✓✔]\s*$/.test(choiceText)) {
        choiceText = choiceText.replace(/\s*[\*✓✔]\s*$/, "").trim();
        marked = true;
      }
      if (/\s*\(correct\)\s*$/i.test(choiceText)) {
        choiceText = choiceText.replace(/\s*\(correct\)\s*$/i, "").trim();
        marked = true;
      }
      choices.push({ text: choiceText, image: { data: "", size: "default", fileName: "" }, _marked: marked });
      state = "choices";
      continue;
    }

    // ── Inside EXPLANATION section ──
    if (state === "explanation") {
      // Educational objective line
      const eduMatch = trimmed.match(/^Educational\s+objective\s*:\s*(.*)/i);
      if (eduMatch) {
        expSubState = "objective";
        if (eduMatch[1].trim()) expObjective.push(eduMatch[1].trim());
        continue;
      }

      // (Choice X) paragraph start
      const wrongChoiceMatch = trimmed.match(/^\(Choice\s+([A-Z])\)\s*(.*)/i);
      if (wrongChoiceMatch) {
        expSubState = "wrong";
        const line = wrongChoiceMatch[2].trim();
        if (line) expWrongParagraphs.push(`(Choice ${wrongChoiceMatch[1].toUpperCase()}) ${line}`);
        else expWrongParagraphs.push(`(Choice ${wrongChoiceMatch[1].toUpperCase()})`);
        continue;
      }

      // Blank line in explanation — just preserve paragraph break
      if (!trimmed) {
        if (expSubState === "main" && expMainParagraphs.length > 0) expMainParagraphs.push("");
        if (expSubState === "wrong" && expWrongParagraphs.length > 0) expWrongParagraphs.push("");
        if (expSubState === "objective" && expObjective.length > 0) expObjective.push("");
        continue;
      }

      // Continuation text in current explanation sub-section
      if (expSubState === "objective") {
        expObjective.push(trimmed);
      } else if (expSubState === "wrong") {
        expWrongParagraphs.push(trimmed);
      } else {
        expMainParagraphs.push(trimmed);
      }
      continue;
    }

    // ── Blank line — skip but transition from metadata to stem ──
    if (!trimmed) {
      if (state === "metadata" && (system || subject || topic || questionId)) {
        state = "stem";
      }
      // In stem, blank line is paragraph break
      if (state === "stem" && stem.trim()) {
        stem += "\n";
      }
      continue;
    }

    // ── STEM: everything between metadata and first choice ──
    if (state === "metadata" || state === "stem") {
      state = "stem";
      stem += (stem && !stem.endsWith("\n") ? "\n" : "") + trimmed;
      continue;
    }

    // ── Continuation of last choice text ──
    if (state === "choices" && choices.length > 0) {
      choices[choices.length - 1].text += " " + trimmed;
    }
  }

  // ── Finalise ──
  stem = stem.trim();
  if (!stem) return null;

  // Auto-detect correct from markers if not explicitly set
  if (!correct && choices.length > 0) {
    const markedIdx = choices.findIndex(c => c._marked);
    if (markedIdx >= 0) correct = String.fromCharCode(65 + markedIdx);
  }

  // Clean up internal markers
  choices = choices.map(c => {
    const { _marked, ...rest } = c;
    return rest;
  });

  // Assemble explanation fields
  explanationCorrect = expMainParagraphs.join("\n").trim();
  explanationWrong = expWrongParagraphs.join("\n").trim();
  summary = expObjective.join("\n").trim();

  return {
    id: questionId || uuid(),
    stem,
    choices,
    correct,
    explanationCorrect,
    explanationWrong,
    summary,
    system,
    subject,
    topic,
    packageId: null,
    productId: null,
    status: "draft",
  };
}


// Simple numbered-format parser (1. What is..., A. ..., Answer: B)
function parseNumberedFormat(text, defaultSystem, defaultSubject, defaultTopic) {
  const lines = text.split("\n");
  const questions = [];
  let current = null;
  let section = "stem";

  const questionStartPatterns = [
    /^(?:Question\s*)?(\d+)[.):\-]\s*(.*)/i,
    /^Q(\d+)[.):\-]?\s*(.*)/i,
  ];
  const choicePatterns = [/^([A-Z])[.):\-]\s*(.*)/i];
  const answerPatterns = [
    /^(?:Answer|Correct\s*Answer|Correct|Key|Ans)[:\s-]+\s*([A-Z])/i,
    /^([A-Z])\s*(?:\(correct\)|\*|✓|✔)/i,
  ];
  const explanationPatterns = [/^(?:Explanation|Rationale|Reason|Exp)[:\s-]+\s*(.*)/i];

  const finalise = () => {
    if (!current) return;
    if (current.stem.trim()) {
      if (!current.correct && current.choices.length > 0) {
        const markedIdx = current.choices.findIndex(c => c._marked);
        if (markedIdx >= 0) current.correct = String.fromCharCode(65 + markedIdx);
      }
      current.choices = current.choices.map(c => { const { _marked, ...rest } = c; return rest; });
      questions.push({ ...current });
    }
    current = null;
    section = "stem";
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (section === "explanation" && current) current.explanationCorrect += "\n";
      continue;
    }

    let ansMatch = null;
    for (const pat of answerPatterns) { ansMatch = trimmed.match(pat); if (ansMatch) break; }
    if (ansMatch && current) { current.correct = ansMatch[1].toUpperCase(); section = "answer"; continue; }

    let expMatch = null;
    for (const pat of explanationPatterns) { expMatch = trimmed.match(pat); if (expMatch) break; }
    if (expMatch && current) { current.explanationCorrect = expMatch[1] || ""; section = "explanation"; continue; }

    let qMatch = null;
    for (const pat of questionStartPatterns) { qMatch = trimmed.match(pat); if (qMatch) break; }
    if (qMatch) {
      const num = parseInt(qMatch[1]);
      const isNew = !current || current.choices.length > 0 || num === 1 || (questions.length > 0 && num === questions.length + 1) || (!current.stem.trim());
      if (isNew) {
        finalise();
        current = {
          id: uuid(), stem: qMatch[2] || "", choices: [], correct: "",
          explanationCorrect: "", explanationWrong: "", summary: "",
          system: defaultSystem || "", subject: defaultSubject || "",
          topic: defaultTopic || "", packageId: null, productId: null, status: "draft",
        };
        section = "stem";
        continue;
      }
    }

    let cMatch = null;
    for (const pat of choicePatterns) { cMatch = trimmed.match(pat); if (cMatch) break; }
    if (cMatch && current) {
      let choiceText = cMatch[2] || "";
      let marked = false;
      if (/\s*[\*✓✔]\s*$/.test(choiceText)) { choiceText = choiceText.replace(/\s*[\*✓✔]\s*$/, "").trim(); marked = true; }
      if (/\s*\(correct\)\s*$/i.test(choiceText)) { choiceText = choiceText.replace(/\s*\(correct\)\s*$/i, "").trim(); marked = true; }
      current.choices.push({ text: choiceText, image: { data: "", size: "default", fileName: "" }, _marked: marked });
      section = "choices";
      continue;
    }

    if (current) {
      if (section === "explanation") {
        current.explanationCorrect += (current.explanationCorrect ? "\n" : "") + trimmed;
      } else if (section === "choices") {
        const lastChoice = current.choices[current.choices.length - 1];
        if (lastChoice) lastChoice.text += " " + trimmed;
      } else {
        current.stem += (current.stem ? "\n" : "") + trimmed;
      }
    } else {
      current = {
        id: uuid(), stem: trimmed, choices: [], correct: "",
        explanationCorrect: "", explanationWrong: "", summary: "",
        system: defaultSystem || "", subject: defaultSubject || "",
        topic: defaultTopic || "", packageId: null, productId: null, status: "draft",
      };
      section = "stem";
    }
  }
  finalise();
  return questions;
}


// Main entry point — auto-detect format
function parseRawQuestions(rawText, defaultSystem, defaultSubject, defaultTopic) {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Detect metadata-header format by looking for "System:" at the start of a line
  if (/^System\s*:/im.test(text)) {
    return parseMetadataFormat(text, defaultSystem, defaultSubject, defaultTopic);
  }

  // Fall back to numbered format
  return parseNumberedFormat(text, defaultSystem, defaultSubject, defaultTopic);
}


// ─── Bulk Paste Import Component ───────────────────────────────
export default function BulkPasteImport({ onImport, onComplete, selectedProduct, availableSystems = [], availableSubjects = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [step, setStep] = useState("paste"); // paste | preview | importing | done
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: [] });

  const textareaRef = useRef(null);

  const handleClose = () => {
    const wasImporting = step === "done";
    setIsOpen(false);
    setRawText("");
    setParsedQuestions([]);
    setStep("paste");
    setExpandedIdx(null);
    setImportProgress({ done: 0, total: 0, errors: [] });
    if (wasImporting && onComplete) onComplete();
  };

  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    const parsed = parseRawQuestions(rawText, "", "", "");
    setParsedQuestions(parsed);
    setStep("preview");
  }, [rawText]);

  const handleRemoveQuestion = (idx) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEditField = (idx, field, value) => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleEditChoice = (qIdx, cIdx, value) => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      const choices = [...copy[qIdx].choices];
      choices[cIdx] = { ...choices[cIdx], text: value };
      copy[qIdx] = { ...copy[qIdx], choices };
      return copy;
    });
  };

  const handleImportAll = async () => {
    if (!selectedProduct) {
      alert("Please select an author product first before importing.");
      return;
    }

    const toImport = parsedQuestions.filter(q => q.stem.trim() && q.choices.length >= 2);
    if (toImport.length === 0) {
      alert("No valid questions to import. Each question needs at least a stem and 2 choices.");
      return;
    }

    setStep("importing");
    setImportProgress({ done: 0, total: toImport.length, errors: [] });

    let done = 0;
    const errors = [];

    for (const q of toImport) {
      try {
        // Attach product
        q.packageId = selectedProduct.id;
        q.productId = selectedProduct.id;

        await onImport(q);
        done++;
      } catch (err) {
        let msg = err.message;
        const statusMatch = msg.match(/^(\d{3}):\s*(.*)/);
        if (statusMatch) {
          const code = statusMatch[1];
          const content = statusMatch[2];
          if (content.includes("<!DOCTYPE") || content.includes("<html>")) {
            msg = `Server Error (${code}): The server encountered a problem (check logs)`;
          } else {
            msg = `Error (${code}): ${content}`;
          }
        } else if (msg.includes("<!DOCTYPE") || msg.includes("<html>")) {
          msg = "Critical server error (HTML response) — maybe hit a duplicate ID or database lock";
        }
        errors.push({ stem: q.stem.substring(0, 50), error: msg });
        done++;
      }
      setImportProgress({ done, total: toImport.length, errors: [...errors] });
    }

    setStep("done");
  };



  const validCount = parsedQuestions.filter(q => q.stem.trim() && q.choices.length >= 2).length;
  const warningCount = parsedQuestions.filter(q => !q.correct).length;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-black rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
      >
        <ClipboardPaste size={14} />
        Bulk Paste
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={handleClose}>
          <div
            className="bg-[#141414] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#2E2A1E] relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-5 bg-gradient-to-r from-[#C9A227] to-[#B8922A] text-black flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Bulk Paste Import</h2>
                  <p className="text-[#3A3010] text-xs font-medium mt-0.5">Paste raw questions → auto-parse → import</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-8 py-3 bg-[#111111] border-b border-[#2E2A1E] flex items-center gap-2 shrink-0">
              {["paste", "preview", "importing", "done"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    step === s ? "bg-[#C9A227] text-black shadow-lg shadow-[#D4AF37]/30" :
                    ["paste", "preview", "importing", "done"].indexOf(step) > i ? "bg-emerald-500 text-white" :
                    "bg-[#1F1F1F] text-slate-400"
                  }`}>{i + 1}</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${step === s ? "text-[#B8922A]" : "text-slate-400"}`}>
                    {s === "paste" ? "Paste" : s === "preview" ? "Review" : s === "importing" ? "Importing" : "Done"}
                  </span>
                  {i < 3 && <div className="w-8 h-px bg-[#2A2A2A] mx-1" />}
                </div>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {/* ── STEP 1: PASTE ── */}
              {step === "paste" && (
                <div className="p-8">

                  {/* Format guide */}
                  <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800">
                    <p className="font-black uppercase tracking-wider text-[10px] mb-2 text-amber-700">📋 Supported formats — just copy-paste as-is</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-bold mb-1">With metadata headers:</p>
                        <pre className="bg-amber-100/50 p-2 rounded-lg text-[10px] font-mono whitespace-pre-wrap leading-relaxed">
{`System: Cardiovascular
Subject: Pathology
Topic: Aortic aneurysm
Question Id: 463

A 66-year-old man comes to the...

A. Chronic transmural inflammation
B. Cystic medial necrosis
C. Focal intimal tear
D. Malignant endothelial proliferation

Correct answer: A

Explanation
This patient's pulsating...

(Choice B) Cystic medial necrosis...

Educational objective:
AAA is associated with...`}
                        </pre>
                      </div>
                      <div>
                        <p className="font-bold mb-1">Auto-detected fields:</p>
                        <ul className="space-y-1.5 list-disc pl-4">
                          <li><code>System:</code> → System field</li>
                          <li><code>Subject:</code> → Subject field</li>
                          <li><code>Topic:</code> → Topic field</li>
                          <li><code>Question Id:</code> → captured (or new ID generated)</li>
                          <li>Text before choices → <strong>Stem</strong></li>
                          <li><code>A.</code> – <code>Z.</code> → <strong>Choices</strong></li>
                          <li><code>Correct answer: X</code> → <strong>Answer</strong></li>
                          <li><code>Explanation</code> block → <strong>Correct Explanation</strong></li>
                          <li><code>(Choice X)</code> blocks → <strong>Wrong Explanation</strong></li>
                          <li><code>Educational objective:</code> → <strong>Summary</strong></li>
                        </ul>
                        <p className="mt-3 font-bold">Paste multiple questions — each starting with <code>System:</code></p>
                      </div>
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={`Paste your questions here... You can paste one or many.\n\nSystem: Cardiovascular\nSubject: Pathology\nTopic: Aortic aneurysm\nQuestion Id: 463\n\nA 66-year-old man comes to the office...\n\nA. Chronic transmural inflammation\nB. Cystic medial necrosis\nC. Focal intimal tear\nD. Malignant endothelial proliferation\n\nCorrect answer: A\n\nExplanation\nThis patient's pulsating mass...\n\n(Choice B) Cystic medial necrosis is...\n\nEducational objective:\nAAA is associated with risk factors...`}
                    className="w-full h-[340px] bg-[#141414] border-2 border-[#2E2A1E] rounded-2xl p-5 text-sm font-mono leading-relaxed outline-none resize-none focus:border-[#E5C158] focus:ring-4 focus:ring-[#241F10] transition-all placeholder:text-slate-300"
                    spellCheck={false}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400 font-medium">{rawText.length > 0 ? `${rawText.split("\n").length} lines` : "Waiting for input..."}</span>
                    <button
                      onClick={handleParse}
                      disabled={!rawText.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      Parse Questions
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: PREVIEW ── */}
              {step === "preview" && (
                <div className="p-8">
                  {/* Summary bar */}
                  <div className="flex items-center gap-4 mb-6 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold">
                      <Check size={14} /> {validCount} valid questions
                    </div>
                    {warningCount > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs font-bold">
                        <AlertTriangle size={14} /> {warningCount} missing correct answer
                      </div>
                    )}
                    {parsedQuestions.length - validCount > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-bold">
                        <AlertTriangle size={14} /> {parsedQuestions.length - validCount} incomplete (need stem + 2 choices)
                      </div>
                    )}
                  </div>

                  {parsedQuestions.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">🤷</div>
                      <p className="text-lg font-bold text-[#A39C86]">No questions detected</p>
                      <p className="text-sm text-slate-400 mt-2">Make sure your text follows one of the supported formats</p>
                      <button onClick={() => setStep("paste")} className="mt-6 px-6 py-2.5 bg-[#241F10] text-[#B8922A] rounded-xl text-xs font-bold hover:bg-[#3A3010] transition-all">
                        ← Back to Paste
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {parsedQuestions.map((q, idx) => {
                        const isExpanded = expandedIdx === idx;
                        const isValid = q.stem.trim() && q.choices.length >= 2;

                        return (
                          <div key={q.id} className={`bg-[#141414] border rounded-2xl overflow-hidden transition-all ${
                            isValid ? "border-[#2E2A1E] hover:border-[#8A6D1B]" : "border-red-200 bg-red-50/30"
                          }`}>
                            {/* Collapsed row */}
                            <div
                              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#111111]/80 transition-all"
                              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            >
                              <span className="w-8 h-8 bg-[#241F10] text-[#B8922A] rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#D9D0B4] truncate font-medium">{q.stem || "(empty stem)"}</p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  {q.id && (
                                    <span className="text-[10px] text-slate-400 font-bold bg-[#111111] px-1.5 py-0.5 rounded border border-[#1F1F1F] italic">
                                      #{q.id}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-bold">{q.choices.length} choices</span>
                                  {q.correct && <span className="text-[10px] text-emerald-600 font-bold">✓ {q.correct}</span>}
                                  {!q.correct && <span className="text-[10px] text-amber-600 font-bold">⚠ No answer</span>}
                                  {q.system && <span className="text-[10px] text-[#D4AF37] font-medium">{q.system}</span>}
                                  {q.subject && <span className="text-[10px] text-[#D4AF37] font-medium">{q.subject}</span>}
                                  {q.topic && <span className="text-[10px] text-slate-400 font-medium">• {q.topic}</span>}
                                  {q.explanationCorrect && <span className="text-[10px] text-emerald-400 font-medium">📖 Explanation</span>}
                                  {q.explanationWrong && <span className="text-[10px] text-red-400 font-medium">📖 Wrong</span>}
                                  {q.summary && <span className="text-[10px] text-[#E5C158] font-medium">📝 Objective</span>}
                                </div>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); handleRemoveQuestion(idx); }}
                                className="w-7 h-7 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg flex items-center justify-center transition-all shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                              <div className="text-slate-400 shrink-0">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-1 border-t border-[#1F1F1F] bg-[#111111]/30">
                                {/* Stem edit */}
                                <div className="mb-3">
                                  <label className="text-[10px] font-black text-[#A39C86] uppercase tracking-wider">Stem</label>
                                  <textarea
                                    value={q.stem}
                                    onChange={e => handleEditField(idx, "stem", e.target.value)}
                                    className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-xl p-3 text-sm outline-none focus:border-[#8A6D1B] focus:ring-2 focus:ring-[#241F10] resize-none"
                                    rows={3}
                                  />
                                </div>

                                {/* Choices */}
                                <div className="mb-3">
                                  <label className="text-[10px] font-black text-[#A39C86] uppercase tracking-wider">Choices</label>
                                  <div className="space-y-2 mt-1">
                                    {q.choices.map((c, ci) => (
                                      <div key={ci} className="flex items-center gap-2">
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                          q.correct === String.fromCharCode(65 + ci) ? "bg-emerald-500 text-white" : "bg-[#171717] text-[#A39C86]"
                                        }`}>{String.fromCharCode(65 + ci)}</span>
                                        <input
                                          value={c.text}
                                          onChange={e => handleEditChoice(idx, ci, e.target.value)}
                                          className="flex-1 bg-[#141414] border border-[#2E2A1E] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8A6D1B] focus:ring-2 focus:ring-[#241F10]"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Answer */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                  <div>
                                    <label className="text-[10px] font-black text-[#A39C86] uppercase tracking-wider">Correct</label>
                                    <select
                                      value={q.correct}
                                      onChange={e => handleEditField(idx, "correct", e.target.value)}
                                      className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-lg p-2 text-sm outline-none focus:border-[#8A6D1B]"
                                    >
                                      <option value="">—</option>
                                      {q.choices.map((_, ci) => (
                                        <option key={ci} value={String.fromCharCode(65 + ci)}>{String.fromCharCode(65 + ci)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-[#A39C86] uppercase tracking-wider">System</label>
                                    <select value={q.system} onChange={e => handleEditField(idx, "system", e.target.value)}
                                      className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-lg p-2 text-sm outline-none focus:border-[#8A6D1B]">
                                      <option value="">—</option>
                                      {(availableSystems || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-[#A39C86] uppercase tracking-wider">Subject</label>
                                    <select value={q.subject} onChange={e => handleEditField(idx, "subject", e.target.value)}
                                      className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-lg p-2 text-sm outline-none focus:border-[#8A6D1B]">
                                      <option value="">—</option>
                                      {(availableSubjects || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-[#A39C86] uppercase tracking-wider">Topic</label>
                                    <input value={q.topic || ""} onChange={e => handleEditField(idx, "topic", e.target.value)}
                                      className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-lg p-2 text-sm outline-none focus:border-[#8A6D1B]" />
                                  </div>
                                </div>

                                {/* Explanation (Correct) */}
                                <div className="mb-3">
                                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">✓ Correct Explanation</label>
                                  <textarea
                                    value={q.explanationCorrect}
                                    onChange={e => handleEditField(idx, "explanationCorrect", e.target.value)}
                                    className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-xl p-3 text-sm outline-none focus:border-[#8A6D1B] focus:ring-2 focus:ring-[#241F10] resize-none"
                                    rows={q.explanationCorrect ? Math.min(6, q.explanationCorrect.split("\n").length + 1) : 2}
                                    placeholder="Explanation for the correct answer (optional)"
                                  />
                                </div>

                                {/* Explanation (Wrong) */}
                                <div className="mb-3">
                                  <label className="text-[10px] font-black text-red-500 uppercase tracking-wider">✗ Wrong Choice Explanations</label>
                                  <textarea
                                    value={q.explanationWrong}
                                    onChange={e => handleEditField(idx, "explanationWrong", e.target.value)}
                                    className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-xl p-3 text-sm outline-none focus:border-[#8A6D1B] focus:ring-2 focus:ring-[#241F10] resize-none"
                                    rows={q.explanationWrong ? Math.min(6, q.explanationWrong.split("\n").length + 1) : 2}
                                    placeholder="(Choice B) explanation... (optional)"
                                  />
                                </div>

                                {/* Summary / Educational Objective */}
                                <div>
                                  <label className="text-[10px] font-black text-[#C9A227] uppercase tracking-wider">📝 Summary / Educational Objective</label>
                                  <textarea
                                    value={q.summary}
                                    onChange={e => handleEditField(idx, "summary", e.target.value)}
                                    className="w-full mt-1 bg-[#141414] border border-[#2E2A1E] rounded-xl p-3 text-sm outline-none focus:border-[#8A6D1B] focus:ring-2 focus:ring-[#241F10] resize-none"
                                    rows={q.summary ? Math.min(4, q.summary.split("\n").length + 1) : 2}
                                    placeholder="Educational objective (optional)"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: IMPORTING ── */}
              {step === "importing" && (
                <div className="p-8 flex flex-col items-center justify-center py-20">
                  <Loader2 size={48} className="text-[#D4AF37] animate-spin mb-6" />
                  <p className="text-xl font-black text-[#D9D0B4]">Importing Questions...</p>
                  <p className="text-sm text-slate-400 mt-2 font-medium">
                    {importProgress.done} / {importProgress.total} complete
                  </p>
                  <div className="w-80 h-3 bg-[#171717] rounded-full mt-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 4: DONE ── */}
              {step === "done" && (
                <div className="p-8 flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mb-6">
                    <Check size={40} className="text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-[#D9D0B4]">Import Complete!</p>
                  <p className="text-sm text-[#A39C86] mt-2 font-medium">
                    Successfully imported {importProgress.total - importProgress.errors.length} of {importProgress.total} questions
                  </p>
                  {importProgress.errors.length > 0 && (
                    <div className="mt-6 w-full max-w-lg bg-red-50 rounded-2xl border border-red-200 p-4">
                      <p className="text-xs font-bold text-red-700 mb-2">⚠ {importProgress.errors.length} errors:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {importProgress.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-600 truncate">• {e.stem}... — {e.error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleClose}
                    className="mt-8 px-8 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Footer (for paste & preview steps) */}
            {(step === "preview" && parsedQuestions.length > 0) && (
              <div className="px-8 py-4 bg-[#111111] border-t border-[#2E2A1E] flex items-center justify-between shrink-0">
                <button onClick={() => setStep("paste")} className="px-5 py-2.5 bg-[#141414] border border-[#2E2A1E] text-[#B8B09A] rounded-xl text-xs font-bold hover:bg-[#171717] transition-all">
                  ← Back to Edit
                </button>
                <button
                  onClick={handleImportAll}
                  disabled={validCount === 0}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Check size={14} />
                  Import {validCount} Questions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
