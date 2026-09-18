"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Check, Info, ChevronUp, ChevronDown, Plus, 
  HelpCircle, Clock 
} from "lucide-react";
import { getAllTests, saveTest } from "@/services/test.service";
import { STATUS_FILTERS, selectRandomQuestions, getPersistentTestId } from "@/utils/createTestHelpers";
import { useTestAssembly } from "./useTestAssembly";

export default function CreateTestTemplateA({ questions, userId }) {
  const router = useRouter();
  const {
    selectedSubjects,
    setSelectedSubjects,
    selectedSystems,
    setSelectedSystems,
    activeFilters,
    numQuestions,
    setNumQuestions,
    mode,
    setMode,
    questionMode,
    setQuestionMode,
    subjectOptions,
    systemOptions,
    filterCounts,
    selectedPool,
    maxAllowed,
    isFormValid,
    toggleSubject,
    toggleSystem,
    toggleFilter,
    subjectCounts,
    systemCounts
  } = useTestAssembly(questions);

  // Collapse states
  const [isTestModeOpen, setIsTestModeOpen] = useState(true);
  const [isQuestionModeOpen, setIsQuestionModeOpen] = useState(true);
  const [isSubjectsOpen, setIsSubjectsOpen] = useState(true);
  const [isSystemsOpen, setIsSystemsOpen] = useState(true);
  const [isNoQuestionsOpen, setIsNoQuestionsOpen] = useState(true);

  console.log("[TemplateA] Rendering with questions:", questions.length);

  async function handleStartTest() {
    if (!isFormValid) return;
    const finalSet = selectRandomQuestions(selectedPool, numQuestions);
    const testId = getPersistentTestId(userId);

    const packageId = localStorage.getItem("medbank_selected_package");
    const packageName = localStorage.getItem("medbank_selected_package_name") || "Standard QBank";
    
    const history = await getAllTests(packageId);
    const testNumber = history.length + 1;

    const testPayload = {
      testId,
      testNumber,
      userId,
      packageId,
      packageName,
      questions: finalSet,
      mode,
      pool: activeFilters,
      date: new Date().toISOString(),
      universeSize: questions.length,
      eligiblePoolSize: selectedPool.length,
      poolLogic: {
        systems: selectedSystems,
        subjects: selectedSubjects,
        usageState: activeFilters.length > 0 ? activeFilters[0].toLowerCase() : "all"
      }
    };

    const saved = await saveTest(testPayload);
    const testAttemptId = saved?.testAttemptId || saved?.latestAttemptId || null;
    localStorage.setItem("medbank_current_test", JSON.stringify({ ...testPayload, ...(saved || {}), testAttemptId }));
    router.push("/student/qbank/take-test");
  }

  const SubjectsBlock = (
    <div className={`border-b border-zinc-800/50 ${activeFilters.length === 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between py-3 cursor-pointer group" onClick={() => activeFilters.length > 0 && setIsSubjectsOpen(!isSubjectsOpen)}>
        <div className="flex items-center gap-2">
          <div onClick={(e) => {
            e.stopPropagation();
            const selectable = subjectOptions.filter(s => (subjectCounts[s] || 0) > 0);
            setSelectedSubjects(selectedSubjects.length === selectable.length && selectable.length > 0 ? [] : selectable);
          }} className={`w-4 h-4 rounded border flex items-center justify-center transition-all mr-2 ${selectedSubjects.length > 0 && selectedSubjects.every(s => (subjectCounts[s] || 0) > 0) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-transparent border-zinc-700 group-hover:border-zinc-500"}`}>
            {selectedSubjects.length > 0 && selectedSubjects.every(s => (subjectCounts[s] || 0) > 0) && <Check size={10} className="text-white" strokeWidth={4} />}
          </div>
          <h2 className="text-[14px] font-bold text-zinc-300">Subjects</h2>
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">(Select All)</span>
        </div>
        {isSubjectsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {isSubjectsOpen && (
        <div className="pb-8 grid grid-cols-2 gap-x-20 gap-y-2">
          {subjectOptions.map(s => {
            const count = subjectCounts[s] || 0;
            const isDisabled = count === 0 && !selectedSubjects.includes(s);
            return (
              <label key={s} className={`flex items-center gap-2 ${isDisabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer group'}`}>
                <div onClick={() => !isDisabled && toggleSubject(s)} className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedSubjects.includes(s) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-transparent border-zinc-700 group-hover:border-zinc-500"}`}>
                  {selectedSubjects.includes(s) && <Check size={10} className="text-white" strokeWidth={4} />}
                </div>
                <span className={`text-[12px] ${selectedSubjects.includes(s) ? "text-zinc-300" : "text-zinc-500"}`}>{s}</span>
                <div className="px-1.5 py-0.5 bg-zinc-800/30 rounded-full text-[10px] text-zinc-600 font-bold">{count}</div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  const SystemsBlock = (
    <div className={`border-b border-zinc-800/50 ${selectedSubjects.length === 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between py-3 cursor-pointer group" onClick={() => selectedSubjects.length > 0 && setIsSystemsOpen(!isSystemsOpen)}>
        <div className="flex items-center gap-2">
          <div onClick={(e) => {
            e.stopPropagation();
            const selectable = systemOptions.filter(s => (systemCounts[s] || 0) > 0);
            setSelectedSystems(selectedSystems.length === selectable.length && selectable.length > 0 ? [] : selectable);
          }} className={`w-4 h-4 rounded border flex items-center justify-center transition-all mr-2 ${selectedSystems.length > 0 && selectedSystems.every(s => (systemCounts[s] || 0) > 0) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-transparent border-zinc-700 group-hover:border-zinc-500"}`}>
            {selectedSystems.length > 0 && selectedSystems.every(s => (systemCounts[s] || 0) > 0) && <Check size={10} className="text-white" strokeWidth={4} />}
          </div>
          <h2 className="text-[14px] font-bold text-zinc-300">Systems</h2>
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">(Select All)</span>
        </div>
        {isSystemsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {isSystemsOpen && (
        <div className="pb-8 grid grid-cols-2 gap-x-20 gap-y-2">
          {systemOptions.map(s => {
            const count = systemCounts[s] || 0;
            const isDisabled = count === 0 && !selectedSystems.includes(s);
            return (
              <label key={s} className={`flex items-center justify-between group pr-2 rounded transition-colors ${isDisabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:bg-white/[0.02]'}`}>
                <div className="flex items-center gap-2">
                  <div onClick={() => !isDisabled && toggleSystem(s)} className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedSystems.includes(s) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-transparent border-zinc-700 group-hover:border-zinc-500"}`}>
                    {selectedSystems.includes(s) && <Check size={10} className="text-white" strokeWidth={4} />}
                  </div>
                  <span className={`text-[12px] ${selectedSystems.includes(s) ? "text-zinc-300" : "text-zinc-500"}`}>{s}</span>
                  <div className="px-1.5 py-0.5 bg-zinc-800/30 rounded-full text-[10px] text-zinc-600 font-bold">{count}</div>
                </div>
                {!isDisabled && <Plus size={12} className="text-zinc-700 group-hover:text-zinc-500" />}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      {/* TEST MODE */}
      <div className="border-b border-zinc-800/50">
        <div className="flex items-center justify-between py-3 cursor-pointer group" onClick={() => setIsTestModeOpen(!isTestModeOpen)}>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-zinc-300">Test Mode</h2>
            <Info size={14} className="text-[#3b82f6]" />
          </div>
          {isTestModeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {isTestModeOpen && (
          <div className="pb-6">
            <div className="flex bg-zinc-900/50 border border-zinc-800 p-1 rounded-full w-fit">
              {["tutor", "timed"].map(m => (
                <button key={m} onClick={() => setMode(m)} className={`px-8 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all ${mode === m ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-400'}`}>
                  {m}
                  {m === "timed" && <Clock size={12} className="inline ml-2 mb-0.5" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QUESTION MODE */}
      <div className="border-b border-zinc-800/50">
        <div className="flex items-center justify-between py-3 cursor-pointer group" onClick={() => setIsQuestionModeOpen(!isQuestionModeOpen)}>
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-bold text-zinc-300">Question Mode</h2>
            <div className="relative group/tooltip">
              <Info size={14} className="text-[#3b82f6] cursor-help" />
              <div className="absolute left-0 top-full mt-2 w-[480px] bg-[#16161a] border border-zinc-800 rounded shadow-2xl p-1 z-[100] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                <table className="w-full text-[12px] border-collapse">
                  <tbody>
                    <tr className="border-b border-zinc-800/50">
                      <td className="p-3 font-bold text-zinc-200 w-[100px]">Unused</td>
                      <td className="p-3 text-zinc-400">Selects questions from a set of new/unseen questions</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="p-3 font-bold text-zinc-200">Incorrect</td>
                      <td className="p-3 text-zinc-400">Selects questions that were previously answered incorrectly</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="p-3 font-bold text-zinc-200">Marked</td>
                      <td className="p-3 text-zinc-400">Selects questions that were previously marked/flagged for review</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="p-3 font-bold text-zinc-200">Omitted</td>
                      <td className="p-3 text-zinc-400">Selects questions that were omitted previously</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-zinc-200">Correct</td>
                      <td className="p-3 text-zinc-400">Selects questions that were previously answered correctly</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Available</span>
              <div className="px-2 py-0.5 bg-zinc-800/80 rounded-full text-[10px] font-black text-[#3b82f6]">
                {questions.length}
              </div>
            </div>
          </div>
          {isQuestionModeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {isQuestionModeOpen && (
          <div className="pb-6 flex flex-col gap-6">

            <div className="flex items-center gap-8">
              {STATUS_FILTERS.map(f => (
                <label key={f} className={`flex items-center gap-2 ${filterCounts[f] === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer group'}`}>
                  <div onClick={() => filterCounts[f] > 0 && toggleFilter(f)} className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.includes(f) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-transparent border-zinc-700 group-hover:border-zinc-500"}`}>
                    {activeFilters.includes(f) && <Check size={10} className="text-white" strokeWidth={4} />}
                  </div>
                  <span className={`text-[12px] font-medium ${activeFilters.includes(f) ? "text-zinc-300" : "text-zinc-500"}`}>{f}</span>
                  <div className="px-1.5 py-0.5 bg-zinc-800/50 rounded-full text-[10px] font-bold text-zinc-500">{filterCounts[f]}</div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {SubjectsBlock}
      {SystemsBlock}

      {/* NO. OF QUESTIONS */}
      <div>
        <div className="flex items-center justify-between py-3 cursor-pointer group" onClick={() => setIsNoQuestionsOpen(!isNoQuestionsOpen)}>
          <h2 className="text-[14px] font-bold text-zinc-300">No. of Questions</h2>
          {isNoQuestionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {isNoQuestionsOpen && (
          <div className="pb-8 flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <input type="number" min={1} max={maxAllowed} value={numQuestions || ""} onChange={e => setNumQuestions(Math.min(maxAllowed, parseInt(e.target.value) || 0))} className="w-[50px] h-[35px] border border-zinc-700 bg-black/40 rounded text-[15px] font-bold text-zinc-100 text-center focus:border-[#3b82f6] outline-none transition-all" />
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-zinc-500">Max allowed per block</span>
                <div className="px-2 py-0.5 bg-zinc-800/60 rounded-full text-[10px] font-black text-[#3b82f6]">{maxAllowed}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleStartTest} disabled={!isFormValid} className={`px-10 py-3 rounded font-bold uppercase tracking-wider text-[13px] transition-all shadow-lg ${isFormValid ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white active:scale-[0.98] shadow-blue-500/20' : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'}`}>GENERATE TEST</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
