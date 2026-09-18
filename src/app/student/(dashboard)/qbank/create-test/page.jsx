"use client";

import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/context/AppContext";
import { getAllQuestions } from "@/services/question.service";
import { getProductById } from "@/services/product.service";
import CreateTestTemplateA from "./CreateTestTemplateA";
import CreateTestTemplateB from "./CreateTestTemplateB";

export default function CreateTestPage() {
  const [questions, setQuestions] = useState([]);
  const [productConfig, setProductConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedStudentProduct } = useContext(AppContext);
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;

  useEffect(() => {
    async function initPage() {
      setIsLoading(true);
      try {
        if (!userId) return;

        // Determine active product context
        const activeProduct = selectedStudentProduct || 
                             JSON.parse(localStorage.getItem("medbank_focused_product") || "null");

        const packageId = activeProduct?.id || "14"; 
        const packageName = activeProduct?.name || "Standard QBank";

        console.log(`[CreateTest] Initializing for Product: ${packageName} (ID: ${packageId})`);

        localStorage.setItem("medbank_selected_package", packageId);
        localStorage.setItem("medbank_selected_package_name", packageName);

        const [p, allFetched] = await Promise.all([
          getProductById(packageId),
          getAllQuestions(packageId)
        ]);

        setProductConfig(p || null);

        const fetchedArray = Array.isArray(allFetched) ? allFetched : [];
        const normalizeLabel = (value) => String(value || "")
          .toLowerCase()
          .replace(/[–—-]/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

        const resolveProductSystem = (questionSystem, productSystems) => {
          if (!Array.isArray(productSystems) || productSystems.length === 0) return questionSystem;
          if (!questionSystem) return questionSystem;

          const exact = productSystems.find((s) => String(s).toLowerCase() === String(questionSystem).toLowerCase());
          if (exact) return exact;

          const normalizedQuestion = normalizeLabel(questionSystem);
          const aliasNormalizedQuestion = normalizedQuestion
            .replace(/\bcardiology\b/g, "cardiovascular")
            .replace(/\becg\b/g, "cardiovascular");

          const fuzzy = productSystems.find((s) => {
            const normalizedSystem = normalizeLabel(s);
            return (
              normalizedSystem === aliasNormalizedQuestion ||
              aliasNormalizedQuestion.includes(normalizedSystem) ||
              normalizedSystem.includes(aliasNormalizedQuestion)
            );
          });

          if (fuzzy) return fuzzy;
          if (productSystems.length === 1) return productSystems[0];
          return questionSystem;
        };

        const normalizedQuestions = fetchedArray.map((q) => ({
          ...q,
          system: resolveProductSystem(q.system, p?.systems),
        }));

        const validQuestions = normalizedQuestions.filter(q => 
          (q.published === 1 || q.published === true || q.lifecycleStatus === 'published' || q.status === 'published') &&
          q.system && q.system.trim() !== '' &&
          q.subject && q.subject.trim() !== ''
        );

        setQuestions(validQuestions);
      } catch (error) {
        console.error("Error initializing create test page:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initPage();
  }, [selectedStudentProduct, userId]);

  const [tab, setTab] = useState("standard"); // "standard" or "custom"

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse font-bold tracking-widest uppercase">Loading Product...</div>
      </div>
    );
  }

  const isTemplateB = productConfig?.templateType === 'ECG';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans select-none overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto px-4 py-8">

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl w-fit mb-10 mx-auto">
          <button
            onClick={() => setTab("standard")}
            className={`px-10 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${tab === 'standard' ? 'bg-[#3b82f6] text-white shadow-xl shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Create New Test
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`px-10 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${tab === 'custom' ? 'bg-[#3b82f6] text-white shadow-xl shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Custom ID Test
          </button>
        </div>

        {tab === 'custom' ? (
          <CustomIdTest questions={questions} userId={userId} />
        ) : (
          <>
            {isTemplateB ? (
              <CreateTestTemplateB
                questions={questions}
                userId={userId}
                productConfig={productConfig}
              />
            ) : (
              <CreateTestTemplateA
                questions={questions}
                userId={userId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CustomIdTest({ questions, userId }) {
  const [pastedIds, setPastedIds] = useState("");
  const [mode, setMode] = useState("tutor");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleStartCustomTest = async () => {
    if (!pastedIds.trim()) return;
    setIsGenerating(true);

    try {
      const tokens = pastedIds.split(/[\n, ]+/).map(id => id.trim()).filter(id => id.length > 0);
      const { getTestById, saveTest } = await import("@/services/test.service");
      const packageId = localStorage.getItem("medbank_selected_package");

      const questionIdSet = new Set();
      const questionIdMap = new Map(questions.map(q => [q.id, q]));

      for (const token of tokens) {
        // 1. Is it a direct question ID?
        if (questionIdMap.has(token)) {
          questionIdSet.add(token);
          continue;
        }

        // 2. Is it a prefix for question IDs? (Optional but keeps current behavior)
        const prefixMatches = questions.filter(q => q.id.startsWith(token));
        if (prefixMatches.length > 0) {
          prefixMatches.forEach(q => questionIdSet.add(q.id));
          continue;
        }

        // 3. Try fetching as a Test ID
        try {
          const test = await getTestById(token, packageId);
          if (test && Array.isArray(test.questions)) {
            test.questions.forEach(qId => {
              // Only add if it exists in our current product context
              if (questionIdMap.has(qId)) {
                questionIdSet.add(qId);
              }
            });
            continue;
          }
        } catch (e) {
          console.warn(`Token ${token} is not a valid test ID`);
        }
      }

      if (questionIdSet.size === 0) {
        alert("No matching questions or tests found for the provided IDs.");
        setIsGenerating(false);
        return;
      }

      const finalSet = Array.from(questionIdSet);

      // Extract subjects and systems for display in lists
      const selectedQuestions = finalSet.map(id => questionIdMap.get(id)).filter(Boolean);
      const customSubjects = [...new Set(selectedQuestions.map(q => q.subject))].filter(Boolean);
      const customSystems = [...new Set(selectedQuestions.map(q => q.system))].filter(Boolean);

      const testId = `${userId}_${Date.now()}_custom`;
      const packageName = localStorage.getItem("medbank_selected_package_name") || "Custom ID Test";

      const testPayload = {
        testId,
        testNumber: null, // Let the list page assign sequential numbers
        userId,
        packageId,
        packageName,
        questions: finalSet,
        mode,
        pool: ["Custom IDs"],
        date: new Date().toISOString(),
        universeSize: questions.length,
        eligiblePoolSize: finalSet.length,
        poolLogic: {
          customIds: tokens,
          usageState: "custom",
          subjects: customSubjects,
          systems: customSystems
        }
      };

      // saveTest from services/test.service
      const saved = await saveTest(testPayload);
      const testAttemptId = saved?.testAttemptId || saved?.latestAttemptId || null;

      localStorage.setItem("medbank_current_test", JSON.stringify({ ...testPayload, ...(saved || {}), testAttemptId }));
      router.push("/student/qbank/take-test");
    } catch (err) {
      console.error(err);
      alert("Failed to generate custom test.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 shadow-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-[#1B263B] dark:text-white mb-2 tracking-tight uppercase">Custom <span className="text-[#3b82f6]">ID</span> Test</h2>
          <p className="text-zinc-500 text-sm font-medium">Paste question IDs or Test IDs separated by commas, spaces, or new lines. If you enter a Test ID, we'll clone all questions from that session.</p>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 ml-1">Paste IDs (Questions or Tests)</label>
            <textarea
              value={pastedIds}
              onChange={(e) => setPastedIds(e.target.value)}
              placeholder="e.g. q-123, test-abc-xyz..."
              className="w-full h-48 bg-zinc-50/50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-sm font-mono text-zinc-700 dark:text-zinc-300 focus:border-[#3b82f6] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 ml-1">Test Mode</label>
            <div className="flex bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 p-1 rounded-full w-fit">
              {["tutor", "timed"].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-10 py-2 rounded-full text-[12px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartCustomTest}
            disabled={!pastedIds.trim() || isGenerating}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[14px] transition-all shadow-2xl ${pastedIds.trim() && !isGenerating
              ? 'bg-[#3b82f6] hover:bg-blue-600 text-white shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.98]'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE TEST FROM IDS'}
          </button>
        </div>
      </div>
    </div>
  );
}
