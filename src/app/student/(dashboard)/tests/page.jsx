"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllTests } from "@/services/test.service";
import { 
   Play, List, BarChart2, Search, Menu,
   CheckCircle2, GraduationCap, ChevronLeft, ChevronRight,
   X, MoreHorizontal, RefreshCw
} from "lucide-react";
import { useContext } from "react";
import { AppContext } from "@/context/AppContext";


export default function PreviousTestsPage() {
  const { selectedStudentProduct } = useContext(AppContext);
  const [tests, setTests] = useState([]);
   const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
   const [copySuccess, setCopySuccess] = useState(null);
  const itemsPerPage = 10;
  const router = useRouter();

  // Reactivity handled by context + useEffect[selectedStudentProduct]

   useEffect(() => {
      async function loadTests() {
         const pId = selectedStudentProduct?.id;
         if (!pId) return;

         const history = await getAllTests(pId);

         // 1. Sort by date ascending to assign sequential numbers (Oldest = 1)
         const sortedByDateAsc = [...history].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

         const normalized = sortedByDateAsc.map((test, index) => {
            const isCustom = test.poolLogic?.usageState === 'custom' || test.testId?.endsWith('_custom') || String(test.pool).includes('Custom IDs');
            return {
               ...test,
               testNumber: index + 1, // Enforce strict sequential numbering
               isCustom
            };
         });

         // 2. Sort by date descending so the LATEST test is on TOP
         const final = normalized.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
         setTests(final);
      }
      loadTests();
   }, [selectedStudentProduct]);

   const handleResume = (test, isResumeOmitted = false) => {
      // Always use all questions from the original test session
      const questions = test.questions || [];
      const questionIds = questions.map(q => typeof q === 'string' ? q : q.id);

      if (questionIds.length === 0) return;

      // Store the original testId in sessionStorage for reuse
      sessionStorage.setItem('current_test_id', test.testId);

      localStorage.setItem("medbank_current_test", JSON.stringify({
         testId: test.testId, // Use the original testId
         testNumber: test.testNumber,
         date: test.date,
         packageId: test.packageId || test.productId || null,
         packageName: test.packageName || null,
         questions: questionIds,
         mode: test.mode,
         pool: test.pool,
         resumeData: {
            originalTestId: test.testId,
            answers: test.answers || {},
            currentIndex: test.currentIndex || 0,
            elapsedTime: test.elapsedTime || 0,
            markedIds: test.markedIds || [],
            isOmittedResume: isResumeOmitted,
            isSuspended: !!test.isSuspended
         }
      }));

      router.push("/student/qbank/take-test");
   };

   const handleViewSummary = (test, tab = "results") => {
      // Store full payload for summary page source-of-truth
      const payload = {
         testId: (test.latestAttemptId || test.testId).toString(),
         packageId: test.packageId || test.productId || null,
         packageName: test.packageName || null,
         mode: test.mode || 'tutor'
      };

      localStorage.setItem("medbank_last_test_info", JSON.stringify(payload));
      localStorage.setItem("medbank_last_test_id", payload.testId); // Keep for legacy
      localStorage.setItem("medbank_summary_tab", tab);
      router.push(`/student/qbank/test-summary?tab=${encodeURIComponent(tab)}`);
   };

   const handleCopyId = (id) => {
      navigator.clipboard.writeText(id).then(() => {
         setCopySuccess(id);
         setTimeout(() => setCopySuccess(null), 2000);
      });
   };

   const filteredTests = tests.filter(test => {
      const testNum = test.testNumber?.toString() || "";
      return testNum.includes(searchQuery);
   });

   const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
   const paginatedTests = filteredTests.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
   );

  return (
     <div className="min-h-screen bg-background text-foreground font-sans pb-20 select-none transition-colors duration-300">
        {/* HEADER */}
        <div className="bg-card border-b border-border transition-colors duration-300">
           <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-[#0072bc] dark:bg-blue-600 rounded flex items-center justify-center text-white">
                    <CheckCircle2 size={20} />
                 </div>
                 <h1 className="text-2xl font-light text-zinc-500 dark:text-zinc-400">Previous <span className="text-zinc-900 dark:text-zinc-100 font-normal">Tests</span></h1>
            </div>
              <div className="flex items-center gap-6">
                 <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    <GraduationCap size={18} />
                 </div>
              </div>
           </div>
        </div>

        <div className="max-w-[1400px] mx-auto p-10">


           {/* TOP CONTROL BAR */}
           <div className="flex items-center justify-between mb-8 py-2">
              <div className="flex items-center gap-3">
              </div>

              <div className="relative w-64 group">
                 <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-2 pr-8 border-b border-border bg-transparent py-1 text-[14px] text-zinc-800 dark:text-zinc-100 font-medium focus:outline-none focus:border-primary transition-all placeholder:text-zinc-400"
                 />
                 <Search size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary" />
              </div>
           </div>

           {/* MAIN TABLE */}
           <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden min-h-[400px] flex flex-col transition-colors duration-300">
              <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          <th className="px-6 py-6 font-normal">Score</th>
                          <th className="px-6 py-6 font-normal">Number</th>
                          <th className="px-6 py-6 font-normal">Date</th>
                          <th className="px-6 py-6 font-normal">Mode</th>
                          <th className="px-6 py-6 font-normal">Q.Pool</th>
                          <th className="px-6 py-6 font-normal">Subjects</th>
                          <th className="px-6 py-6 font-normal">Systems</th>
                          <th className="px-6 py-6 font-normal">Stream</th>
                          <th className="px-6 py-6 font-normal"># Q&apos;s</th>
                          <th className="px-6 py-6 text-right font-normal">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                       {paginatedTests.length === 0 ? (
                          <tr>
                             <td colSpan="9" className="px-6 py-20 text-center text-muted-foreground text-[14px]">
                                No tests found
                             </td>
                          </tr>
                       ) : (
                             paginatedTests.map((test) => {
                                const hasAttemptStats = !!test.attemptStats && typeof test.attemptStats === 'object';
                                const totalCount = hasAttemptStats ? Number(test.attemptStats.total || 0) : (test.questions || []).length;
                                const correctCount = hasAttemptStats ? Number(test.attemptStats.correct || 0) : (test.questions || []).filter(q => q.userAnswer === q.correct).length;
                                const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                                const isSuspended = test.isSuspended === 1 || test.isSuspended === '1' || test.isSuspended === true;
                                const omittedCount = hasAttemptStats ? Number(test.attemptStats.omitted || 0) : (test.questions || []).filter(q => !q.userAnswer).length;
                                const allOmitted = totalCount > 0 && omittedCount === totalCount;

                                // Determine Subjects/Systems (augmented by server if missing)
                                let subjectsList = test.poolLogic?.subjects || [];
                                let systemsList = test.poolLogic?.systems || [];

                                // Fallback: Legacy Template A might have them in 'pool'
                                if (subjectsList.length === 0 && Array.isArray(test.pool)) {
                                   const FILTER_EXCLUDES = ["Unused", "Incorrect", "Marked", "Omitted", "Correct", "Custom IDs"];
                                   subjectsList = test.pool.filter(p => !FILTER_EXCLUDES.includes(p));
                                }

                                const displaySubjects = subjectsList.length > 1
                                   ? "MULTIPLE"
                                    : (subjectsList[0]?.toUpperCase() || "--");

                                const displaySystems = systemsList.length > 1
                                   ? "MULTIPLE"
                                   : (systemsList[0]?.toUpperCase() || "--");

                                let displayPool = "MULTIPLE";
                                const poolRaw = test.poolLogic?.usageState || test.pool;
                                if (poolRaw === 'custom' || test.isCustom) {
                                   displayPool = "CUSTOM IDS";
                                } else if (Array.isArray(poolRaw)) {
                                   if (poolRaw.length === 1) {
                                      displayPool = poolRaw[0].toUpperCase();
                                   } else if (poolRaw.length === 0) {
                                      displayPool = "NONE";
                                   }
                                } else if (typeof poolRaw === 'string') {
                                   if (poolRaw === 'All Questions') displayPool = "ALL";
                                   else displayPool = poolRaw.toUpperCase();
                                }

                                return (
                                   <tr key={test.testId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                      <td className="px-6 py-5">
                                         <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-200 relative border border-zinc-200 dark:border-zinc-700">
                                            {percentage}%
                                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                               <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth="2" />
                                               <circle
                                                  cx="20" cy="20" r="18" fill="transparent" stroke={percentage >= 70 ? "#10b981" : "#3b82f6"}
                                                  strokeWidth="2" strokeDasharray={2 * Math.PI * 18}
                                                  strokeDashoffset={2 * Math.PI * 18 * (1 - percentage / 100)}
                                                  strokeLinecap="round"
                                               />
                                            </svg>
                                         </div>
                                      </td>
                                      <td
                                         className="px-6 py-5 text-[14px] font-black text-zinc-900 dark:text-blue-400 truncate max-w-[50px] cursor-copy select-none relative group"
                                         onDoubleClick={() => handleCopyId(test.testNumber)}
                                         title="Double-click to copy"
                                      >
                                         {test.testNumber}{test.isCustom ? 'C' : ''}
                                         {copySuccess === test.testNumber && (
                                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 font-bold whitespace-nowrap z-50">
                                               COPIED!
                                            </span>
                                         )}
                                      </td>
                                      <td className="px-6 py-5 text-[14px] text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                                         {new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </td>
                                      <td className="px-6 py-5 text-[14px] text-zinc-900 dark:text-zinc-100 font-bold lowercase">
                                         {test.mode === 'tutor' ? 'tutor' : 'timed'}
                                      </td>
                                      <td className="px-6 py-5 text-[11px] text-[#0072bc] dark:text-white font-black uppercase tracking-widest" title={displayPool}>
                                         {displayPool}
                                      </td>
                                      <td className="px-6 py-5 text-[13px] text-zinc-900 dark:text-zinc-100 font-black" title={subjectsList.join(', ')}>
                                         {displaySubjects}
                                      </td>
                                      <td className="px-6 py-5 text-[13px] text-zinc-900 dark:text-zinc-100 font-black" title={systemsList.join(', ')}>
                                         {displaySystems}
                                      </td>

                                       <td className="px-6 py-5 whitespace-nowrap">
                                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${test.packageId && test.packageId !== 'default' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                                             {test.packageId && test.packageId !== 'default' ? (test.packageName || 'PREMIUM') : 'STANDARD'}
                                          </span>
                                       </td>
                                       <td className="px-6 py-5 text-[14px] text-zinc-900 dark:text-zinc-100 font-black font-mono">{totalCount}</td>
                                      <td className="px-6 py-5 text-right">
                                         <div className="flex items-center justify-end gap-3 text-[#3b82f6] dark:text-blue-400">
                                            {isSuspended ? (
                                               <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResume(test); }} className="hover:scale-110 transition-all p-1.5" title="Resume Progress">
                                                  <Play size={18} />
                                               </button>
                                            ) : (
                                                  omittedCount > 0 && (
                                                     <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResume(test, true); }} className="hover:scale-110 transition-all p-1.5" title="Resume Omitted">
                                                        <Play size={18} className="fill-blue-500/20" />
                                                     </button>
                                                  )
                                            )}
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewSummary(test, "results"); }} className="hover:scale-110 transition-all p-1.5" title="View Results">
                                               <List size={18} />
                                            </button>
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewSummary(test, "analysis"); }} className="hover:scale-110 transition-all p-1.5" title="View Analysis">
                                               <BarChart2 size={18} />
                                            </button>
                                         </div>
                                      </td>
                                   </tr>
                                );
                             })
                       )}
                    </tbody>
                 </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
                 <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Showing <span className="text-zinc-900 dark:text-zinc-100 font-bold">{paginatedTests.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> to <span className="text-zinc-900 dark:text-zinc-100 font-bold">{Math.min(currentPage * itemsPerPage, filteredTests.length)}</span> of <span className="text-zinc-900 dark:text-zinc-100 font-bold">{filteredTests.length}</span> tests
                 </div>
                 <div className="flex items-center gap-2">
                    <button
                       onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                       disabled={currentPage === 1}
                       className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                       <ChevronLeft size={18} className="text-zinc-500 dark:text-zinc-400" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                       <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 rounded text-[13px] font-medium transition-all ${currentPage === page ? 'bg-[#3b82f6] text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                       >
                          {page}
                       </button>
                    ))}
                    <button
                       onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                       disabled={currentPage === totalPages || totalPages === 0}
                       className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                       <ChevronRight size={18} className="text-zinc-500 dark:text-zinc-400" />
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* FOOTER */}
        <footer className="fixed bottom-0 left-0 w-full bg-card border-t border-border py-3 text-center transition-colors duration-300">
           <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Copyright © MedBank. All rights reserved.</span>
        </footer>
    </div>
  );
}
