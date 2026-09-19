"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

import { memo, useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAllQuestions } from "@/services/question.service";
import InteractiveText from "@/components/shared/InteractiveText";
import { saveTest, getTestById, updateAttemptAnswer, updateAttemptFlag, snapshotAttempt, finishAttempt } from "@/services/test.service";
import { submitFeedback } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, Flag, ChevronLeft, ChevronRight, Maximize2, 
  HelpCircle, FlaskConical, StickyNote, Calculator, 
  Contrast, ZoomIn, Settings, Layers, 
  MessageSquare, PauseCircle, LogOut, AlertTriangle,
  Power, Pause, Check, X, BarChart2, Clock
 } from "lucide-react";

function imageSizeClass(size) {
  if (size === "small") return "max-w-[240px] mx-auto rounded-lg border mt-3 block";
  if (size === "medium") return "max-w-[480px] mx-auto rounded-lg border mt-3 block";
  if (size === "large") return "max-w-[720px] mx-auto rounded-lg border mt-3 block";
  return "max-w-full mx-auto rounded-lg border mt-3 block";
}

const QuestionRail = memo(function QuestionRail({
  questions,
  currentIndex,
  answers,
  markedQuestions,
  isReviewMode,
  mode,
  lockedAnswers,
  onSelectIndex
}) {
  return questions.map((_, idx) => {
    const isCurrent = idx === currentIndex;
    const qItem = questions[idx];
    if (!qItem) return null;
    const qId = qItem.id;
    const userAnswer = answers[qId];
    const hasAnswer = !!userAnswer;
    const isMarked = markedQuestions.has(qId);

    // Only show correctness if it's review mode, or tutor mode + specifically locked
    const showResult = isReviewMode || (mode === "tutor" && !!lockedAnswers[qId]);
    const isCorrect = showResult && hasAnswer && userAnswer === qItem.correct;

    return (
      <button
        key={idx}
        onClick={() => onSelectIndex(idx)}
        className={`w-full py-4 flex flex-col items-center justify-center transition-all border-l-4 relative ${isCurrent
          ? 'bg-blue-400/10 border-amber-400'
          : 'border-transparent hover:bg-white/5 hover:text-white'
          }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-[15px] font-black tracking-tighter ${isCurrent ? 'text-amber-400' : 'text-white/40'}`}>
            {idx + 1}
          </span>
          <div className="flex gap-1 items-center h-1.5">
            {showResult ? (
              hasAnswer && (
                <div className={`w-1.5 h-1.5 rounded-full ${isCorrect ? 'bg-emerald-400' : 'bg-red-500'}`} title={isCorrect ? "Correct" : "Incorrect"} />
              )
            ) : (
              hasAnswer && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Answered" />
              )
            )}
            {isMarked && <Flag size={9} className="text-orange-500 fill-orange-500" title="Marked" />}
          </div>
        </div>
      </button>
    );
  });
});

const ExamFooter = memo(function ExamFooter({
  isReviewMode,
  currentIndex,
  totalQuestions,
  mode,
  onEnd,
  onSuspend,
  onOpenFeedback,
  onPrevious,
  onNext
}) {
  return (
    <footer className="bg-[#002b5c] text-white h-[45px] flex items-center px-0 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] z-50 border-t border-white/10">
      <div className="flex items-center h-full">
        {!isReviewMode && (
          <button
            onClick={onEnd}
            className="flex items-center gap-2 px-4 h-full hover:bg-white/10 transition-colors group"
          >
            <Power size={18} className="text-white/70 group-hover:text-white" />
            <span className="text-[13px] font-medium leading-none">End</span>
          </button>
        )}

        {!isReviewMode && (
          <>
            <div className="w-px h-6 bg-white/20" />

            <button
              onClick={onSuspend}
              className="flex items-center gap-2 px-4 h-full hover:bg-white/10 transition-colors group"
            >
              <Pause size={18} className="text-white/70 group-hover:text-white" />
              <span className="text-[13px] font-medium leading-none">Suspend</span>
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex justify-center h-full">
        <button
          onClick={onOpenFeedback}
          className="flex items-center gap-2 px-4 h-full hover:bg-white/10 transition-colors group"
        >
          <MessageSquare size={16} className="text-white/70 group-hover:text-white" />
          <span className="text-[13px] font-medium leading-none">Feedback</span>
        </button>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 h-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors group border-l border-white/10"
        >
          <ChevronLeft size={20} />
          <span className="text-[13px] font-medium leading-none">Previous</span>
        </button>
        <button
          onClick={onNext}
          disabled={currentIndex === totalQuestions - 1 && (mode === "tutor" || isReviewMode)}
          className="flex items-center gap-2 px-6 h-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors group border-l border-white/10"
        >
          <span className="text-[13px] font-medium leading-none">Next</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </footer>
  );
});

export default function TakeTestPage() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: selection }
  const [isSubmitted, setIsSubmitted] = useState(false); 
  const [mode, setMode] = useState("tutor");
  const [isReviewMode, setIsReviewMode] = useState(mode === 'review');
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [originalTestId, setOriginalTestId] = useState(null);
  const [lockedAnswers, setLockedAnswers] = useState({}); // To identify answers that cannot be changed
  const [firstAnswers, setFirstAnswers] = useState({}); // To track first choice for change analysis
  const [sessionTestId, setSessionTestId] = useState(null);
  const [testAttemptId, setTestAttemptId] = useState(null); // Track strict attempt ID
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [strikeouts, setStrikeouts] = useState({}); // { questionId: Set of letters }
  const [modal, setModal] = useState({ show: false, title: "", message: "", onConfirm: null });
  const [isEnding, setIsEnding] = useState(false);
  const [loadingQuestionIds, setLoadingQuestionIds] = useState(new Set()); // Track which questions are loading
  const router = useRouter();
  const handleEndBlockRef = useRef(null);
  const submissionInFlightRef = useRef(false);
  const handleSuspendRef = useRef(null);
  const handlePreviousRef = useRef(null);
  const handleNextRef = useRef(null);
  const unsavedSecondsRef = useRef(0);
  const timerStateRef = useRef({ globalTime: 0, questionDurations: {} });
  const lastCurrentTestSnapshotRef = useRef("");
  const hasRestoredRef = useRef(false); // Guard: prevent sync effect from writing empty state before restore
  const [questionDurations, setQuestionDurations] = useState({}); // Local display only
  const [globalTime, setGlobalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const currentQuestionId = questions[currentIndex]?.id || null;
  const isTutorSubmittedOnCurrent = mode === 'tutor' && !!(currentQuestionId && lockedAnswers[currentQuestionId]);

  const formatSeconds = (sec) => {
    const val = typeof sec === 'number' ? sec : 0;
    const s = Math.floor(Math.abs(val));
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };

  // Fetch full question data by ID
  const fetchFullQuestion = async (questionId, includeAnswers = false) => {
    if (!questionId) return null;
    
    try {
      const url = includeAnswers 
        ? `/api/questions/${questionId}?includeAnswers=true`
        : `/api/questions/${questionId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to fetch question:', questionId, response.status);
        return null;
      }
      const fullQuestion = await response.json();
      return fullQuestion;
    } catch (error) {
      console.error('Error fetching full question:', error);
      return null;
    }
  };

  // Effect to fetch full question data when current question changes
  useEffect(() => {
    if (questions.length === 0 || !currentQuestionId) return;
    
    const currentQ = questions[currentIndex];
    
    // Check if current question already has full data (has stem, choices, etc.)
    const hasFullData = currentQ && currentQ.stem && currentQ.choices && currentQ.choices.length > 0;
    
    // In review mode, also check if we have answer fields
    const hasAnswerFields = isReviewMode && currentQ && currentQ.correct && currentQ.explanationCorrect;
    const needsFetch = !hasFullData || (isReviewMode && !hasAnswerFields);
    
    if (!needsFetch) {
      // Question already has the required data, no need to fetch
      return;
    }
    
    // Fetch full question data (include answers only in review mode)
    const loadFullQuestion = async () => {
      setLoadingQuestionIds(prev => new Set([...prev, currentQuestionId]));
      
      const fullQuestion = await fetchFullQuestion(currentQuestionId, isReviewMode);
      
      if (fullQuestion) {
        setQuestions(prevQuestions => {
          const updated = [...prevQuestions];
          updated[currentIndex] = { ...updated[currentIndex], ...fullQuestion };
          return updated;
        });
      }
      
      setLoadingQuestionIds(prev => {
        const next = new Set(prev);
        next.delete(currentQuestionId);
        return next;
      });
    };
    
    loadFullQuestion();
    
    // Prefetch next question in background (don't include answers for prefetch)
    if (currentIndex < questions.length - 1) {
      const nextQuestionId = questions[currentIndex + 1]?.id;
      if (nextQuestionId) {
        const nextQ = questions[currentIndex + 1];
        const nextHasFullData = nextQ && nextQ.stem && nextQ.choices && nextQ.choices.length > 0;
        
        if (!nextHasFullData) {
          fetchFullQuestion(nextQuestionId, false).then(fullQuestion => {
            if (fullQuestion) {
              setQuestions(prevQuestions => {
                const updated = [...prevQuestions];
                updated[currentIndex + 1] = { ...updated[currentIndex + 1], ...fullQuestion };
                return updated;
              });
            }
          });
        }
      }
    }
  }, [currentQuestionId, currentIndex, questions, isReviewMode]);

  useEffect(() => {
    handleSuspendRef.current = handleSuspend;
    handlePreviousRef.current = handlePrevious;
    handleNextRef.current = handleNext;
  });

  const handleSubmitFeedback = async () => {
    const clean = String(feedbackText || "").trim();
    if (!clean) {
      setFeedbackError("Please write feedback before sending.");
      return;
    }
    if (clean.length > 500) {
      setFeedbackError("Feedback is limited to 500 characters.");
      return;
    }

    const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
    const currentQuestionId = questions[currentIndex]?.id ? String(questions[currentIndex].id) : null;

    setIsSendingFeedback(true);
    setFeedbackError("");
    try {
      await submitFeedback({
        userId: localStorage.getItem("medbank_user"),
        message: clean,
        source: "test_session",
        questionId: currentQuestionId,
        testId: currentTestData.testId || sessionTestId || null,
        page: "/student/qbank/take-test"
      });
      setFeedbackText("");
      setIsFeedbackOpen(false);
    } catch (error) {
      setFeedbackError(error?.message || "Failed to send feedback.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  // Timer Effect ("UWorld" Logic)
  useEffect(() => {
    // RULE: Stop timer if Review Mode, Suspended (Paused), or Question is ALREADY Answered (IN TUTOR MODE)
    if (!currentQuestionId) return;

    // Global Stop conditions
    if (isReviewMode || isPaused || isEnding || isTutorSubmittedOnCurrent) {
      return;
    }

    const timer = setInterval(() => {
      setGlobalTime(prev => prev + 1);

      // Track per-question time only while active/unanswered
      setQuestionDurations(prev => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + 1
      }));
      // Accumulate unsaved time for DB flush
      unsavedSecondsRef.current += 1;
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionId, isReviewMode, isPaused, isEnding, isTutorSubmittedOnCurrent]);

  // Persistence on Unload
  useEffect(() => {
    const handleUnload = () => {
      const q = questions[currentIndex];
      if (!q) return;

      const persisted = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
      const persistedAnswer = persisted?.answers?.[q.id];
      syncTimeWithDB(q.id, persistedAnswer, { keepalive: true });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentIndex, questions]);

  const writeCurrentTestData = useCallback((nextData) => {
    try {
      const serialized = JSON.stringify(nextData);
      if (serialized === lastCurrentTestSnapshotRef.current) return;
      localStorage.setItem("medbank_current_test", serialized);
      lastCurrentTestSnapshotRef.current = serialized;
    } catch (error) {
      console.error("[Exam Runtime] Failed to persist medbank_current_test:", error);
    }
  }, []);

  // Auto-save answers and flags to localStorage
  const saveToLocalStorage = useCallback((updates) => {
    const testData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
    const updated = { ...testData, ...updates };
    writeCurrentTestData(updated);
  }, [writeCurrentTestData]);

  const resolveActiveTestId = (currentTestData = {}) => {
    const storedSessionId = typeof window !== 'undefined'
      ? sessionStorage.getItem('current_test_id')
      : null;

    let activeTestId = sessionTestId || String(currentTestData.testId || currentTestData.resumeData?.originalTestId || storedSessionId || "");

    if (!activeTestId) {
      const uid = localStorage.getItem("medbank_user") || "guest";
      activeTestId = `${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_test_id', activeTestId);
    }

    if (sessionTestId !== activeTestId) {
      setSessionTestId(activeTestId);
    }

    return activeTestId;
  };



  // Load saved state from localStorage on mount
  const loadSavedState = () => {
    const saved = localStorage.getItem("medbank_current_test");
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved);
      return {
        answers: parsed.answers || {},
        markedIds: parsed.markedIds || [],
        currentIndex: parsed.currentIndex || 0
      };
    } catch {
      return {};
    }
  };

  // Load test configuration
  useEffect(() => {
    const testData = JSON.parse(localStorage.getItem("medbank_current_test"));
    
    // Redirect if no test data found
    if (!testData || !testData.questions) {
      router.push("/student/qbank/create-test");
      return;
    }

    const testMode = testData.mode || "tutor";
    setMode(testMode);
    setIsReviewMode(!!testData.isReview);
    const initialTestId = resolveActiveTestId(testData);
    saveToLocalStorage({ testId: initialTestId });
    
    async function fetchQuestions() {
      const effectivePackageId = testData.packageId || localStorage.getItem("medbank_selected_package");
      const all = await getAllQuestions(effectivePackageId);
      
      // Reconstruct the question order
      const rawIds = testData.questions || [];
      const selectedIds = rawIds.map(id => (typeof id === 'object' && id !== null) ? String(id.id) : String(id));
      const selected = all.filter(q => selectedIds.includes(String(q.id)));
      const ordered = selectedIds.map(id => selected.find(q => String(q.id) === id)).filter(Boolean);
      
      setQuestions(ordered);

      // --- RESTORE STATE ---
      const sourceAnswers = testData.answers || testData.resumeData?.answers || {};
      setAnswers(sourceAnswers);
      setGlobalTime(testData.elapsedTime ?? testData.resumeData?.elapsedTime ?? 0);
      setQuestionDurations(testData.questionDurations || testData.resumeData?.questionDurations || {});
      setMarkedQuestions(new Set(testData.markedIds || testData.resumeData?.markedIds || []));
      setFirstAnswers(testData.firstAnswers || testData.resumeData?.firstAnswers || {});

      // --- CRITICAL FIX: EXACT INDEX RESTORATION ---
      // We strictly use the saved index. We DO NOT check for omitted questions.
      const savedIndex = testData.currentIndex ?? testData.resumeData?.currentIndex ?? 0;
      setCurrentIndex(savedIndex);

      // --- RESTORE LOCKS (Fixes Ghost/Auto-Submit) ---
      if (testData.isReview) {
        setLockedAnswers(sourceAnswers);
        setIsSubmitted(true);
      } else if (testMode === "tutor") {
        const persistedLocks = testData.lockedAnswers || testData.resumeData?.lockedAnswers || {};
        const answeredLocks = Object.entries(sourceAnswers || {}).reduce((acc, [qid, ans]) => {
          if (ans !== null && ans !== undefined && ans !== "") {
            acc[qid] = ans;
          }
          return acc;
        }, {});

        // On resume in tutor mode, any answered question must remain immutable.
        setLockedAnswers({ ...answeredLocks, ...persistedLocks });
      } else {
        // Test Mode: Start fresh/unlocked on refresh
        setLockedAnswers({});
        setIsSubmitted(false);
      }

      // --- SET ACTIVE SELECTION ---
      const activeQuestion = ordered[savedIndex];
      if (activeQuestion) {
        const currentAnswer = sourceAnswers[activeQuestion.id];
        setSelectedAnswer(currentAnswer || null);
        
        // Determine if the current question should look "Submitted"
        if (testData.isReview) {
          setIsSubmitted(true);
        } else if (testMode === "tutor") {
          // In tutor mode, look at the lockedAnswers to decide if we show the explanation
          const isLocked = testData.lockedAnswers?.[activeQuestion.id];
          setIsSubmitted(!!isLocked);
        } else {
          setIsSubmitted(false);
        }
      }

      hasRestoredRef.current = true; // Mark restore complete - sync effect can now safely write
    }
    fetchQuestions();
  }, [router]);

  // Sync state to localStorage AND History for robust persistence
  useEffect(() => {
    if (questions.length === 0 || isReviewMode || isEnding) return;
    if (!hasRestoredRef.current) return; // Don't sync until restore is complete

    const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");

    // 1. Update Current Session (Use currentTestData.testId which is now guaranteed by load effect)
    const activeTestId = sessionTestId || String(currentTestData.testId || currentTestData.resumeData?.originalTestId || "");
    if (!activeTestId) return; // Prevent sync if ID isn't ready

    // FIX: Persist all important state fields so they can be restored on refresh
    const updatedTestData = {
      ...currentTestData,
      testId: activeTestId,
      answers,           // Ensure answers are saved
      currentIndex,     // Ensure position is saved
      lockedAnswers,    // Ensure Tutor submissions are remembered
      markedIds: Array.from(markedQuestions), // Ensure marks are saved
      firstAnswers,
      questionDurations: timerStateRef.current.questionDurations,
      elapsedTime: timerStateRef.current.globalTime // Ensure timer state is saved
    };
    writeCurrentTestData(updatedTestData);
  }, [answers, currentIndex, lockedAnswers, markedQuestions, firstAnswers, questions.length, isReviewMode, isEnding, sessionTestId]);

  useEffect(() => {
    timerStateRef.current = { globalTime, questionDurations };
  }, [globalTime, questionDurations]);

  useEffect(() => {
    if (questions.length === 0 || isReviewMode || isEnding) return;

    const syncTimerState = () => {
      const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
      const activeTestId = sessionTestId || String(currentTestData.testId || currentTestData.resumeData?.originalTestId || "");
      if (!activeTestId) return;

      writeCurrentTestData({
        ...currentTestData,
        testId: activeTestId,
        questionDurations: timerStateRef.current.questionDurations,
        elapsedTime: timerStateRef.current.globalTime
      });
    };

    const intervalId = setInterval(syncTimerState, 5000);
    return () => clearInterval(intervalId);
  }, [questions.length, isReviewMode, isEnding, sessionTestId]);

  // Real-time synchronization helper - NOW ATTEMPT SCOPED
  const ensureAttemptId = async () => {
    const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
    const existing = testAttemptId || currentTestData.testAttemptId || null;
    if (existing) return existing;

    // Create attempt immediately via saveTest and persist
    try {
      const activeTestId = resolveActiveTestId(currentTestData);
      const fallbackQuestionIds = Array.isArray(questions)
        ? questions.map((qObj) => String(qObj?.id)).filter(Boolean)
        : [];
      const questionPayload = Array.isArray(currentTestData.questions) && currentTestData.questions.length > 0
        ? currentTestData.questions
        : fallbackQuestionIds;

      const saved = await saveTest({
        ...currentTestData,
        testId: activeTestId,
        questions: questionPayload,
        userId: currentTestData.userId || localStorage.getItem("medbank_user"),
        packageId: currentTestData.packageId || localStorage.getItem("medbank_selected_package") || "14",
        packageName: currentTestData.packageName || localStorage.getItem("medbank_selected_package_name") || null,
        isSuspended: false
      });
      const attemptId = saved?.testAttemptId || saved?.latestAttemptId || null;
      if (attemptId) {
        setTestAttemptId(attemptId);
        // FIX: Re-read localStorage AFTER the async saveTest call to avoid overwriting
        // answers/lockedAnswers that were written during the async gap.
        // Only merge in the attemptId, not the full API response which has stale answers.
        const freshTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
        writeCurrentTestData({ ...freshTestData, testAttemptId: attemptId });
      }
      return attemptId;
    } catch (e) {
      console.error('[Exam Runtime] Failed to create attemptId on-demand:', e);
      return null;
    }
  };

  // --- Sync Helper ---
  const syncTimeWithDB = async (qId, currentOption, options = {}) => {
    if (isReviewMode) return;

    // Time Tracking (Accumulated Seconds)
    const secondsElapsed = unsavedSecondsRef.current;

    // Only flush if we have accumulated time or an answer change is forced
    if (secondsElapsed > 0 || currentOption) {
      // FIX: Read fresh answers from localStorage instead of using stale closure
      const freshData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
      const freshAnswers = freshData.answers || {};
      const ok = await persistAttemptAnswerForCurrentQuestion(currentOption, freshAnswers, options);
      // persistAttemptAnswerForCurrentQuestion already resets unsavedSecondsRef on success
    }
  };

  const persistAttemptAnswerForCurrentQuestion = async (letter, nextAnswers, options = {}) => {
    if (isReviewMode || isEnding) return false;

    const attemptId = await ensureAttemptId();
    if (!attemptId) {
      console.error("[Exam Runtime] No testAttemptId found for attempt-scoped write.");
      return false;
    }

    const q = questions[currentIndex];
    if (!q) return false;

    // Time Tracking (Accumulated Seconds)
    const secondsElapsed = unsavedSecondsRef.current;

    const ok = await updateAttemptAnswer(attemptId, q.id, letter || null, secondsElapsed, options);

    // Reset accumulator only if successful
    if (ok) {
      unsavedSecondsRef.current = 0;
    }

    if (!ok && !options.keepalive) {
      console.error('[Exam Runtime] Failed to persist attempt answer to DB', { attemptId, questionId: q.id });
      return false;
    }

    // FIX: Do NOT write answers to localStorage here.
    // localStorage is already kept in sync by saveToLocalStorage() and the sync effect.
    // Writing here with the (potentially stale) nextAnswers argument caused race conditions
    // that wiped out submitted answers on refresh.
    return true;
  };

  const q = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLoadingQuestion = loadingQuestionIds.has(currentQuestionId);
  const hasFullData = q && q.stem && q.choices && q.choices.length > 0;
  // In review mode or after tutor submission, we also need answer fields
  const needsAnswerFields = isReviewMode || (mode === 'tutor' && isSubmitted);
  const hasAnswerFields = q && q.correct && q.explanationCorrect;
  // Show loading if: currently loading, or don't have basic data, or need answers but don't have them
  const shouldShowLoading = isLoadingQuestion || !hasFullData || (needsAnswerFields && !hasAnswerFields);

  const handleQuestionJump = useCallback((idx) => {
    setCurrentIndex(idx);
    saveToLocalStorage({ currentIndex: idx });

    const previousAnswer = answers[questions[idx]?.id] || null;
    setSelectedAnswer(previousAnswer);
    setIsSubmitted(isReviewMode || ((mode === 'tutor') && !!lockedAnswers[questions[idx]?.id]));
  }, [answers, questions, isReviewMode, mode, lockedAnswers, saveToLocalStorage]);

  const handleOpenFeedback = useCallback(() => {
    setFeedbackError("");
    setIsFeedbackOpen(true);
  }, []);

  const handleFooterEnd = useCallback(() => {
    if (handleEndBlockRef.current) {
      handleEndBlockRef.current();
    }
  }, []);

  const handleFooterSuspend = useCallback(() => {
    if (handleSuspendRef.current) {
      handleSuspendRef.current();
    }
  }, []);

  const handleFooterPrevious = useCallback(() => {
    if (handlePreviousRef.current) {
      handlePreviousRef.current();
    }
  }, []);

  const handleFooterNext = useCallback(() => {
    if (handleNextRef.current) {
      handleNextRef.current();
    }
  }, []);







  // Sync state to handleEndBlockRef
  useEffect(() => {
    handleEndBlockRef.current = handleEndBlock;
  });

  // Handle Browser Back Button as End Block
  useEffect(() => {
    if (isReviewMode) return;

    const handlePopState = (e) => {
      // Re-push state to stay on page initially
      window.history.pushState(null, "", window.location.href);

      // Treat back button as "End Block"
      if (handleEndBlockRef.current) {
        handleEndBlockRef.current();
      }
    };

    // Push initial entry to intercept the first 'back' click
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isReviewMode, router]);




  const handleSelectAnswer = async (letter) => {
    if (isReviewMode) return;

    // In Tutor mode, we lock once submitted.
    // In Test mode, we NEVER lock until the end.
    if (mode === 'tutor' && isSubmitted) return;
    if (lockedAnswers[q.id]) return;

    // Track the first answer ever picked for this session
    if (!firstAnswers[q.id]) {
      setFirstAnswers(prev => ({ ...prev, [q.id]: letter }));
    }

    if (selectedAnswer === letter) {
      // Unchoose
      // Remove strikeout if selecting
      if (strikeouts[q.id]?.has(letter)) {
        toggleStrikeout(letter);
      }

      const previousAnswers = answers;
      const nextAnswers = { ...answers };
      delete nextAnswers[q.id];

      // Optimistic update for responsiveness
      setSelectedAnswer(null);
      setAnswers(nextAnswers);
      saveToLocalStorage({ answers: nextAnswers });

      const persisted = await persistAttemptAnswerForCurrentQuestion(null, nextAnswers);
      if (!persisted) {
        setSelectedAnswer(letter);
        setAnswers(previousAnswers);
        saveToLocalStorage({ answers: previousAnswers });
      }
      return;
    }

    // Choose or Change
    const previousSelected = selectedAnswer;
    const previousAnswers = answers;
    const nextAnswers = { ...answers, [q.id]: letter };

    // Optimistic update for responsiveness
    setSelectedAnswer(letter);
    setAnswers(nextAnswers);
    saveToLocalStorage({ answers: nextAnswers });

    const persisted = await persistAttemptAnswerForCurrentQuestion(letter, nextAnswers);
    if (!persisted) {
      setSelectedAnswer(previousSelected || null);
      setAnswers(previousAnswers);
      saveToLocalStorage({ answers: previousAnswers });
      return;
    }
  };

  const toggleStrikeout = async (letter) => {
    if (isReviewMode || isSubmitted) return;

    // If striking out the selected option, treat as an UNSELECT action and persist to DB+localStorage.
    if (selectedAnswer === letter && answers[q.id] === letter) {
      const nextAnswers = { ...answers };
      delete nextAnswers[q.id];
      const persisted = await persistAttemptAnswerForCurrentQuestion(null, nextAnswers);
      if (!persisted) return;
      setSelectedAnswer(null);
      setAnswers(nextAnswers);
    }

    setStrikeouts(prev => {
      const qStrikeouts = new Set(prev[q.id] || []);
      if (qStrikeouts.has(letter)) {
        qStrikeouts.delete(letter);
      } else {
        qStrikeouts.add(letter);
      }
      return { ...prev, [q.id]: qStrikeouts };
    });
  };

  const handleSubmit = () => {
    if (isReviewMode) return;
    if (!selectedAnswer) return;
    
    if (mode === "tutor") {
      (async () => {
        const nextAnswers = { ...answers, [q.id]: selectedAnswer };
        const persisted = await persistAttemptAnswerForCurrentQuestion(selectedAnswer, nextAnswers);
        if (!persisted) {
          console.error('[Exam Runtime] Tutor submit failed to persist answer; keeping session unsubmitted');
          return;
        }
        setAnswers(nextAnswers);

        // Lock after submit (tutor semantics)
        const nextLocked = { ...lockedAnswers, [q.id]: selectedAnswer };
        setLockedAnswers(nextLocked);
        setIsSubmitted(true);

        // FIX: Save BOTH answers AND lockedAnswers together to prevent data loss on refresh
        saveToLocalStorage({ answers: nextAnswers, lockedAnswers: nextLocked });

        // PHASE 2: Fetch answer fields after submission in tutor mode
        const fullQuestionWithAnswers = await fetchFullQuestion(currentQuestionId, true);
        if (fullQuestionWithAnswers) {
          setQuestions(prevQuestions => {
            const updated = [...prevQuestions];
            updated[currentIndex] = { ...updated[currentIndex], ...fullQuestionWithAnswers };
            return updated;
          });
        }
      })();
    } else {
      handleNext();
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      const nextIdx = currentIndex + 1;
      
      // 1. Update UI State
      setCurrentIndex(nextIdx);

      // 2. FORCE SAVE to LocalStorage immediately (Fixes the "Back to Q1" bug)
      saveToLocalStorage({ currentIndex: nextIdx });

      // 3. Update Selection for the new question
      const previousAnswer = answers[questions[nextIdx]?.id] || null;
      setSelectedAnswer(previousAnswer);
      setIsSubmitted(isReviewMode || (mode === "tutor" && !!lockedAnswers[questions[nextIdx]?.id]));

    } else if (!isReviewMode) {
      handleEndBlock();
    }
  };

  const handlePrevious = () => {
    // Auto-save time before moving (always sync time)
    if (!isReviewMode) {
      syncTimeWithDB(questions[currentIndex]?.id, answers[questions[currentIndex]?.id]);
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);

      // Force a save of the index immediately
      saveToLocalStorage({ currentIndex: prevIdx });

      const previousAnswer = answers[questions[prevIdx]?.id] || null;
      setSelectedAnswer(previousAnswer);
      const prevQId = questions[prevIdx]?.id;
      setIsSubmitted(isReviewMode || ((mode === 'tutor') && !!lockedAnswers[prevQId]));
    }
  };

  const toggleMark = async () => {
    const previousMarked = new Set(markedQuestions);
    const newMarked = new Set(previousMarked);
    const isNowMarked = !previousMarked.has(q.id);

    // Allow flag/unflag during review as well
    // Atomic attempt update + localStorage sync (together)
    const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
    const attemptId = currentTestData.testAttemptId || testAttemptId;
    if (!attemptId) {
      console.error('[Exam Runtime] No attemptId for flag update');
      return;
    }

    if (newMarked.has(q.id)) newMarked.delete(q.id);
    else newMarked.add(q.id);

    // Optimistic update for faster UI response
    setMarkedQuestions(newMarked);
    saveToLocalStorage({ markedIds: Array.from(newMarked) });

    const ok = await updateAttemptFlag(attemptId, q.id, isNowMarked);
    if (!ok) {
      console.error('[Exam Runtime] Failed to persist attempt flag to DB', { attemptId, questionId: q.id });
      setMarkedQuestions(previousMarked);
      saveToLocalStorage({ markedIds: Array.from(previousMarked) });
      return;
    }

    try {
      // Optional: Dispatch progress refresh for UI sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event("medbank_progress_refresh"));
      }
    } catch (err) {
      console.warn('[Exam Runtime] Failed to dispatch progress refresh:', err);
    }
  };

  const handleSuspend = (showConfirm = true) => {
    if (isReviewMode) {
      const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
      const payload = {
        testId: testAttemptId || currentTestData.testAttemptId || sessionTestId || currentTestData.testId,
        packageId: currentTestData.packageId || localStorage.getItem("medbank_selected_package"),
        packageName: currentTestData.packageName || null,
        mode: currentTestData.mode || 'tutor'
      };
      localStorage.setItem("medbank_last_test_info", JSON.stringify(payload));
      router.push("/student/qbank/test-summary");
      return;
    }

    const executeSuspend = async () => {
      setIsEnding(true);
      const testData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
      const activeTestId = resolveActiveTestId(testData);

      // Persist attempt snapshot before suspending (mandatory)
      try {
        const attemptId = await ensureAttemptId();
        if (attemptId) {
          const snap = {
            questionIds: questions.map(qObj => String(qObj?.id)).filter(Boolean),
            answers: { ...answers },
            markedIds: Array.from(markedQuestions).map(String),
            timeSpent: { ...timerStateRef.current.questionDurations },
            elapsedTime: timerStateRef.current.globalTime,
            questionSnapshots: questions
          };
          const ok = await snapshotAttempt(attemptId, snap);
          if (!ok) {
            console.error('[Exam Runtime] snapshotAttempt failed during suspend; aborting suspend to prevent DB/local mismatch');
            setIsEnding(false);
            return;
          }
        }
      } catch (e) {
        console.error('[Exam Runtime] Failed to snapshot attempt during suspend:', e);
      }

      const sessionToSave = {
        testId: activeTestId,
        testNumber: Number(testData.testNumber) || Number(testData.resumeData?.testNumber) || 1,
        userId: testData.userId || localStorage.getItem("medbank_user"),
        packageId: testData.packageId || localStorage.getItem("medbank_selected_package") || "14",
        packageName: testData.packageName || localStorage.getItem("medbank_selected_package_name") || "Premium Stream",
        date: testData.date || new Date().toISOString(),
        questions: questions.map(q => ({
          id: q?.id,
          correct: q?.correct,
          userAnswer: answers[q?.id] || null,
          subject: q?.subject,
          system: q?.system,
          timeSpent: Number(timerStateRef.current.questionDurations?.[q?.id] || 0)
        })),
        mode,
        pool: testData.pool || "All Questions",
        answers,
        firstAnswers,
        currentIndex,
        elapsedTime: timerStateRef.current.globalTime,
        markedIds: Array.from(markedQuestions),
        isSuspended: true,
        universeSize: testData.universeSize || questions.length,
        eligiblePoolSize: testData.eligiblePoolSize || questions.length,
        poolLogic: testData.poolLogic || {}
      };

      await saveTest(sessionToSave);
      localStorage.removeItem("medbank_current_test");
      router.push("/student/qbank");
    };

    if (showConfirm) {
      setModal({
        show: true,
        title: "Suspend Test session",
        message: "Are you sure you want to suspend this test? You will be able to resume this session exactly where you left off from your Previous Tests history.",
        onConfirm: executeSuspend
      });
    } else {
      executeSuspend();
    }
  };

  const handleEndBlock = (isAuto = false) => {
    const processSubmission = async () => {
      if (submissionInFlightRef.current) return;
      submissionInFlightRef.current = true;
      setIsEnding(true);
      
      const currentTestData = JSON.parse(localStorage.getItem("medbank_current_test") || "{}");
      const activeTestId = resolveActiveTestId(currentTestData);
      let attemptIdToFinish = testAttemptId || currentTestData.testAttemptId || null;
      
      if (isReviewMode) {
        const payload = {
          testId: attemptIdToFinish || activeTestId,
          packageId: currentTestData.packageId || localStorage.getItem("medbank_selected_package"),
          packageName: currentTestData.packageName || null,
          mode: currentTestData.mode || 'tutor'
        };
        localStorage.setItem("medbank_last_test_info", JSON.stringify(payload));
        router.push("/student/qbank/test-summary");
        return;
      }

      if (!attemptIdToFinish && !isReviewMode) {
        try {
          const fallbackQuestionIds = Array.isArray(questions)
            ? questions.map((qObj) => String(qObj?.id)).filter(Boolean)
            : [];
          const questionPayload = Array.isArray(currentTestData.questions) && currentTestData.questions.length > 0
            ? currentTestData.questions
            : fallbackQuestionIds;

          const saved = await saveTest({
            ...currentTestData,
            testId: activeTestId,
            questions: questionPayload,
            userId: currentTestData.userId || localStorage.getItem("medbank_user"),
            packageId: currentTestData.packageId || localStorage.getItem("medbank_selected_package") || "14",
            packageName: currentTestData.packageName || localStorage.getItem("medbank_selected_package_name") || null,
            isSuspended: false
          });
          attemptIdToFinish = saved?.testAttemptId || saved?.latestAttemptId || null;
          if (attemptIdToFinish) {
            setTestAttemptId(attemptIdToFinish);
            writeCurrentTestData({
              ...currentTestData,
              ...(saved || {}),
              testAttemptId: attemptIdToFinish
            });
          }
        } catch (e) {
          console.error('[Exam Runtime] Failed to create attempt during submission:', e);
        }
      }

      if (attemptIdToFinish) {
        const snapshot = {
          questionIds: questions.map(qObj => String(qObj?.id)).filter(Boolean),
          answers: { ...answers },
          markedIds: Array.from(markedQuestions).map(String),
          timeSpent: { ...timerStateRef.current.questionDurations },
          elapsedTime: timerStateRef.current.globalTime,
          questionSnapshots: questions
        };

        const ok = await finishAttempt(attemptIdToFinish, snapshot);
        if (!ok) {
          console.error('[Exam Runtime] finishAttempt failed; aborting redirect to prevent DB/local mismatch');
          submissionInFlightRef.current = false;
          setIsEnding(false);
          return;
        }

        localStorage.setItem("medbank_last_attempt_id", attemptIdToFinish);
      } else {
        console.error("CRITICAL: No testAttemptId found during submission!");
        submissionInFlightRef.current = false;
        setIsEnding(false);
        return;
      }

      // 3. Set full payload for summary page source-of-truth
      const payload = {
        testId: attemptIdToFinish || activeTestId,
        packageId: currentTestData.packageId || localStorage.getItem("medbank_selected_package") || "14",
        packageName: currentTestData.packageName || localStorage.getItem("medbank_selected_package_name") || null,
        mode: currentTestData.mode || 'tutor'
      };
      localStorage.setItem("medbank_last_test_info", JSON.stringify(payload));
      localStorage.setItem("medbank_last_test_id", activeTestId);
      localStorage.removeItem("medbank_current_test");
      
      // Clear the testId from sessionStorage since test is completed
      sessionStorage.removeItem('current_test_id');
      
      // Dispatch refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event("medbank_progress_refresh"));
      }

      router.push("/student/qbank/test-summary");
    };

    if (isAuto) {
      processSubmission();
    } else {
      let msg, title, type;
      if (isReviewMode) {
        title = "End Review Session";
        msg = "Are you sure you want to exit this review session?";
        type = "info";
      } else {
        const unansweredCount = questions.length - Object.keys(answers).length;
        if (unansweredCount > 0) {
          title = "End Test Block Permanently";
          msg = `Warning: You still have ${unansweredCount} unanswered questions. If you end this block now, it will be marked as finished. You can resume the omitted questions later from your history, but your current answers will be saved permanently and cannot be changed.`;
          type = "danger";
        } else {
          title = "End Test Session";
          msg = "Great job finishing all questions! Are you sure you want to end this block? This will calculate your final score and record the results permanently.";
          type = "confirm";
        }
      }

      setModal({
        show: true,
        title: title,
        message: msg,
        type: type,
        confirmText: isReviewMode ? "End Review" : "End Block Permanently",
        onConfirm: processSubmission,
      });
    }
  };

  if (questions.length === 0 || !q) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002b5c]"></div>
      </div>
    );
  }

  // Show loading skeleton while fetching full question data
  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 bg-[#f3f4f6] dark:bg-[#0F0F12] flex flex-col z-[9999] font-sans overflow-hidden select-none text-[#333] dark:text-zinc-300 transition-colors duration-300">
        {/* HEADER */}
        <header className="bg-[#002b5c] text-white h-[45px] flex items-center px-4 shrink-0 shadow-lg z-50 font-medium relative border-b border-white/10">
          <div className="flex items-center gap-5">
            <div className="flex gap-4">
              <div className="w-5 h-5 bg-white/20 rounded animate-pulse" />
              <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Item ID:</span>
                <div className="w-12 h-4 bg-white/20 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex-1 flex justify-center items-center">
            <div className="w-16 h-4 bg-white/20 rounded animate-pulse" />
          </div>
        </header>

        {/* MAIN CONTENT - LOADING SKELETON */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#16161a] p-6 lg:p-8 transition-colors duration-300">
          <div className="w-full flex flex-col gap-10">
            {/* Question Stem Skeleton */}
            <div className="w-full space-y-6">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-5/6" />
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-4/5" />
            </div>

            {/* Choices Skeleton */}
            <div className="w-full space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-1/4" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f3f4f6] dark:bg-[#0F0F12] flex flex-col z-[9999] font-sans overflow-hidden select-none text-[#333] dark:text-zinc-300 transition-colors duration-300">
      
      {/* HEADER */}
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
              <span className="text-[14px] font-bold text-white tracking-tight leading-none">{q.id}</span>
            </div>
          </div>

          <div
            onClick={toggleMark}
            className="flex items-center gap-1.5 cursor-pointer group ml-2 hover:text-orange-400 transition-colors"
          >
            <Flag size={14} className={markedQuestions.has(q?.id) ? "fill-orange-500 text-orange-500" : "text-white/50 group-hover:text-white"} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${markedQuestions.has(q?.id) ? "text-orange-500" : "text-white/80"}`}>Mark</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <span className="text-[13px] font-bold">
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 mr-4">
            {[
              { Icon: ZoomIn, label: 'Zoom' },
              { Icon: Settings, label: 'Settings' },
              { Icon: HelpCircle, label: 'Help' },
              { Icon: Maximize2, label: 'Full' }
            ].map((tool, i) => (
              <tool.Icon key={i} size={18} className="cursor-pointer hover:text-blue-300 transition-colors opacity-70" />
            ))}
          </div>


          {/* VISUAL TIMER LOGIC */}
          {!isReviewMode && (mode !== 'tutor' || !isSubmitted) ? (
            <div className={`flex items-center gap-2 font-mono text-[16px] font-bold tracking-tight px-3 py-1 rounded border border-white/5 ${mode === 'timed' ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-400 bg-black/20'}`}>
              {(() => {
                if (mode === 'timed') {
                  const limit = questions.length * 90; // Default 90s per question
                  const remaining = Math.max(0, limit - globalTime);
                  return formatSeconds(remaining);
                }
                return formatSeconds(globalTime);
              })()}
            </div>
          ) : isReviewMode ? (
            <button
              onClick={() => router.push('/student/qbank/test-summary')}
              className="px-4 py-1.5 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 rounded text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
            >
              Exit Review
            </button>
          ) : (
            <div className="w-[80px]" /> /* Empty space holder when hidden */
          )}


        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        {/* NAV BAR SIDEBAR (QUESTION LIST) */}
        <aside
          className={`bg-[#002b5c] border-r border-[#16368a] transition-all duration-300 overflow-y-auto no-scrollbar flex flex-col ${showQuestionList ? 'w-[64px]' : 'w-0'}`}
        >
          {showQuestionList && isReviewMode && (
            <div className="py-6 border-b border-white/10 flex flex-col items-center gap-6 text-white/60 bg-black/20">
              <div className="flex flex-col items-center gap-2" title="Results Summary">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] font-black text-emerald-400">{questions.filter(qItem => answers[qItem.id] === qItem.correct).length}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[12px] font-black text-red-500">{questions.filter(qItem => answers[qItem.id] && answers[qItem.id] !== qItem.correct).length}</span>
                </div>
              </div>
              <div className="flex flex-col items-center h-px w-8 bg-white/10" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">Peer Avg</span>
                <span className="text-[12px] font-black text-white/80">
                  {(() => {
                    let peerSum = 0;
                    questions.forEach(qItem => {
                      const dist = qItem.choiceDistribution || {};
                      const totalPicks = Object.values(dist).reduce((a, b) => a + b, 0);
                      const correctPicks = dist[qItem.correct] || 0;
                      peerSum += totalPicks > 0 ? (correctPicks / totalPicks) : 0;
                    });
                    return questions.length > 0 ? Math.round((peerSum / questions.length) * 100) : 0;
                  })()}%
                </span>
              </div>
            </div>
          )}
          <QuestionRail
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            markedQuestions={markedQuestions}
            isReviewMode={isReviewMode}
            mode={mode}
            lockedAnswers={lockedAnswers}
            onSelectIndex={handleQuestionJump}
          />
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#16161a] p-6 lg:p-8 transition-colors duration-300">
          <div className="w-full flex flex-col gap-10">
          
            {/* TOP SECTION: Question Context (Stem) */}
            <div className="w-full space-y-6">
              {q.stemImage?.data && q.stemImage.placement === 'top' && (
                <div className="mb-4 flex justify-center">
                  <img src={q.stemImage.data} alt="stem" loading="lazy" className={`rounded border-2 border-zinc-100 shadow-sm ${imageSizeClass(q.stemImage.size || 'default')}`} />
                </div>
              )}
              <InteractiveText
                text={q.stem}
                sectionImage={q.stemImage?.data}
                gallery={q.gallery}
                className="text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200 font-medium"
              />
              {q.stemImage?.data && (q.stemImage.placement === 'bottom' || !q.stemImage.placement) && (
                <div className="mt-8 flex justify-center">
                  <img src={q.stemImage.data} alt="stem" loading="lazy" className={`rounded border-2 border-zinc-100 shadow-sm ${imageSizeClass(q.stemImage.size || 'default')}`} />
                </div>
              )}
            </div>

            {/* BOTTOM SECTION: Choices and Rest of Parts */}
            <div className="w-full space-y-10">
            {/* Choices */}
              <div className="space-y-4">
                {/* Matrix Headers if applicable */}
                {q.matrixColumns && q.matrixColumns.length > 0 && (
                  <div className="flex gap-2 mb-2 pl-[52px] pr-4"> {/* 16px padding + 20px radio + 16px gap */}
                    {/* Spacer for Letter (40px) + Gap (16px) */}
                    <div className="w-[56px] shrink-0" />

                    {/* Spacer for Text if Matrix is After and Text is shown */}
                    {q.matrixPlacement === 'after' && !q.hideOptionText && <div className="flex-1" />}

                    {q.matrixColumns.map((col, idx) => (
                      <div key={idx}
                        className={`text-[15px] font-black text-[#334155] dark:text-zinc-400 text-center flex items-center justify-center rounded-lg bg-transparent px-2 py-3 leading-tight ${col.vertical ? 'w-24' : 'w-40'}`}
                      >
                        {col.label}
                      </div>
                    ))}

                    {/* Spacer for Text if Matrix is Before and Text is shown */}
                    {q.matrixPlacement === 'before' && !q.hideOptionText && <div className="flex-1" />}
                  </div>
                )}

                {(q.choices || []).map((choice, i) => {
                const letter = String.fromCharCode(65 + i);
                const isSelected = selectedAnswer === letter;
                const isCorrect = q.correct === letter;
                const isStruck = strikeouts[q.id]?.has(letter);
                
                const isLocked = !!lockedAnswers[q.id];
                
                  let choiceStyle = "bg-transparent dark:bg-transparent";
                let radioStyle = "border-zinc-400 dark:border-zinc-600 border-[3px]";

                if (isLocked) {
                  choiceStyle = "opacity-80 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20 cursor-not-allowed";
                }
                
                if (isSelected) {
                  radioStyle = "border-[#0072bc] bg-[#0072bc]";
                }

                if (isReviewMode || (mode === "tutor" && isSubmitted)) {
                  choiceStyle = "border-transparent bg-transparent pointer-events-none opacity-80 cursor-default";
                  if (isSelected) {
                    radioStyle = "border-[#0072bc] bg-[#0072bc]";
                  } else if (isCorrect) {
                    radioStyle = "border-zinc-300 border-[3px]";
                  } else {
                    radioStyle = "border-zinc-200 border-[2px] opacity-40";
                  }
                }

                const showFeedback = isReviewMode || (mode === "tutor" && isSubmitted);

                // Real Stats Calculation
                const dist = q.choiceDistribution || {};
                const totalPicks = Object.values(dist).reduce((a, b) => a + b, 0);
                const correctPicks = dist[q.correct] || 0;
                const correctPercentage = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;

                return (
                  <div 
                    key={i}
                    className={`flex items-start gap-2 rounded-md transition-all ${choiceStyle} relative group`}
                  >
                    {/* Feedback Icons (X or Check) */}
                    {showFeedback && (
                      <div className="w-6 shrink-0 flex items-center justify-center mt-1.5">
                        {isCorrect && <Check size={20} className="text-green-500 stroke-[4px]" />}
                        {isSelected && !isCorrect && <X size={20} className="text-red-500 stroke-[4px]" />}
                      </div>
                    )}

                    <div className="flex flex-1 items-start gap-4 p-4 py-2.5">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAnswer(letter);
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${radioStyle} ${isStruck ? 'opacity-20' : ''}`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                      </div>
                      <div
                        className="flex-1 flex items-start gap-4 cursor-pointer relative"
                        onClick={() => toggleStrikeout(letter)}
                      >
                        {/* Always show the Choice Letter and Feedback Stats if applicable */}
                        <div className={`flex flex-col shrink-0 min-w-[2.5rem] ${isStruck ? 'opacity-40' : ''}`}>
                          <div className={`text-[13px] ${isSelected ? "font-black text-[#0072bc]" : "font-bold text-zinc-500"}`}>
                            {letter}.
                          </div>
                          {showFeedback && (
                            <div className="text-zinc-400 dark:text-zinc-500 font-normal text-[11px] mt-0.5">
                              {correctPercentage}%
                            </div>
                          )}
                        </div>

                        {/* Option Text (if Matrix is After) */}
                        {q.matrixPlacement === 'after' && !q.hideOptionText && (
                          <div className={`flex-1 text-[15px] select-none ${isStruck ? 'line-through text-zinc-400 dark:text-zinc-600' : isSelected ? "font-bold text-zinc-900 dark:text-[#f8fafc]" : "font-medium text-zinc-700 dark:text-zinc-300"}`}>
                            <div className="flex flex-col">
                              {choice.image?.data && choice.image.placement === 'top' && (
                                <img src={choice.image.data} alt={`choice-${letter}`} loading="lazy" className={`rounded border mt-1 mb-2 ${imageSizeClass(choice.image.size || 'default')}`} />
                              )}
                              <div className="flex items-center gap-1">
                                <InteractiveText text={choice.text} sectionImage={choice.image?.data} gallery={q.gallery} className="inline-block" />
                              </div>
                              {choice.image?.data && (choice.image.placement === 'bottom' || !choice.image.placement) && (
                                <img src={choice.image.data} alt={`choice-${letter}`} loading="lazy" className={`rounded border mt-2 ${imageSizeClass(choice.image.size || 'default')}`} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Matrix Values */}
                        <div className="flex gap-2">
                          {q.matrixColumns?.map((col, idx) => (
                            <div key={idx}
                              className={`flex items-center justify-center text-[18px] font-medium transition-all ${isStruck ? 'opacity-20 line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'} bg-transparent rounded-lg ${col.vertical ? 'w-24' : 'w-40'}`}
                            >
                              {choice.matrixValues?.[idx] || ""}
                            </div>
                          ))}
                        </div>

                        {/* Option Text (if Matrix is Before) */}
                        {q.matrixPlacement === 'before' && !q.hideOptionText && (
                          <div className={`flex-1 text-[15px] select-none border-l border-zinc-100 dark:border-white/5 pl-4 ${isStruck ? 'line-through text-zinc-400 dark:text-zinc-600' : isSelected ? "font-bold text-zinc-900 dark:text-[#f8fafc]" : "font-medium text-zinc-700 dark:text-zinc-300"}`}>
                            <div className="flex flex-col">
                              {choice.image?.data && choice.image.placement === 'top' && (
                                <img src={choice.image.data} alt={`choice-${letter}`} className={`rounded border mt-1 mb-2 ${imageSizeClass(choice.image.size || 'default')}`} />
                              )}
                              <div className="flex items-center gap-1">
                                <InteractiveText text={choice.text} sectionImage={choice.image?.data} gallery={q.gallery} className="inline-block" />
                              </div>
                              {choice.image?.data && (choice.image.placement === 'bottom' || !choice.image.placement) && (
                                <img src={choice.image.data} alt={`choice-${letter}`} loading="lazy" className={`rounded border mt-2 ${imageSizeClass(choice.image.size || 'default')}`} />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit / Action Button */}
            {!isReviewMode && !(mode === "tutor" && isSubmitted) && (
              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className="w-full sm:w-auto bg-[#0072bc] hover:bg-[#005a96] text-white px-12 py-3 rounded shadow-lg font-bold text-[13px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-[#0072bc]"
                >
                  {mode === "tutor" ? "Submit" : "Next"}
                </button>
              </div>
            )}

            {/* Explanation (Tutor or Review Mode) */}
            {(isReviewMode || (mode === "tutor" && isSubmitted)) && (
                <div className="p-8 lg:p-10 bg-white dark:bg-zinc-900/50 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <div className="space-y-8">
                    <div className="max-w-none">
                    <div className={`flex items-center gap-10 p-6 rounded-lg mb-8 bg-[#1e1e24] dark:bg-zinc-800/50 border-l-[6px] transition-all ${selectedAnswer === q.correct ? 'border-green-500' : 'border-red-500'}`}>
                      <div className="flex flex-col min-w-[100px]">
                        <span className={`text-[20px] font-bold ${selectedAnswer === q.correct ? 'text-green-500' : 'text-red-500'}`}>
                          {!selectedAnswer ? 'Omitted' : (selectedAnswer === q.correct ? 'Correct' : 'Incorrect')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 border-l border-zinc-700/50 pl-10 h-10">
                        <BarChart2 size={24} className="text-zinc-400 opacity-60" strokeWidth={1.5} />
                        <div className="flex flex-col">
                          <span className="text-zinc-100 dark:text-zinc-200 font-bold leading-none text-lg">
                            {(() => {
                              const dist = q.choiceDistribution || {};
                              const totalPicks = Object.values(dist).reduce((a, b) => a + b, 0);
                              const correctPicks = dist[q.correct] || 0;
                              return totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;
                            })()}
                            %
                          </span>
                            <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mt-1">Others Correct</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-l border-zinc-700/50 pl-10 h-10">
                        <Clock size={24} className="text-zinc-400 opacity-60" strokeWidth={1.5} />
                        <div className="flex flex-col">
                            <span className="text-white font-bold leading-none text-lg">
                              {formatSeconds(questionDurations[q.id] || 0)}
                          </span>
                            <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mt-1">Time Spent</span>
                        </div>
                      </div>


                    </div>
                    
                      <div className="text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200 space-y-4">
                        {q.explanationCorrectImage?.data && q.explanationCorrectImage.placement === 'top' && (
                          <div className="mb-4 flex justify-center">
                            <img src={q.explanationCorrectImage.data} alt="Rationale Analysis" loading="lazy" className={`rounded-xl border border-zinc-200 shadow-sm ${imageSizeClass(q.explanationCorrectImage.size || 'default')}`} style={{ maxHeight: '400px', objectFit: 'contain' }} />
                          </div>
                        )}
                        {(q.explanationCorrect || '').split('\n').map((para, i) => <InteractiveText key={i} text={para} sectionImage={q.explanationCorrectImage?.data} gallery={q.gallery} />)}
                        {q.explanationCorrectImage?.data && (q.explanationCorrectImage.placement === 'bottom' || !q.explanationCorrectImage.placement) && (
                          <div className="mt-4 flex justify-center">
                            <img src={q.explanationCorrectImage.data} alt="Rationale Analysis" loading="lazy" className={`rounded-xl border border-zinc-200 shadow-sm ${imageSizeClass(q.explanationCorrectImage.size || 'default')}`} style={{ maxHeight: '400px', objectFit: 'contain' }} />
                          </div>
                        )}
                    </div>
                  </div>

                  {q.explanationWrong && (
                      <div className="pt-8 border-t border-zinc-100">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4">Incorrect Explanations</h4>
                        <div className="text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200 space-y-4">
                          {q.explanationWrongImage?.data && q.explanationWrongImage.placement === 'top' && (
                            <div className="mb-4 flex justify-center">
                              <img src={q.explanationWrongImage.data} alt="Distractor Analysis" loading="lazy" className={`rounded-xl border border-zinc-200 shadow-sm ${imageSizeClass(q.explanationWrongImage.size || 'default')}`} style={{ maxHeight: '400px', objectFit: 'contain' }} />
                            </div>
                          )}
                          {(q.explanationWrong || '').split('\n').map((para, i) => <InteractiveText key={i} text={para} sectionImage={q.explanationWrongImage?.data} gallery={q.gallery} />)}
                          {q.explanationWrongImage?.data && (q.explanationWrongImage.placement === 'bottom' || !q.explanationWrongImage.placement) && (
                            <div className="mt-4 flex justify-center">
                              <img src={q.explanationWrongImage.data} alt="Distractor Analysis" loading="lazy" className={`rounded-xl border border-zinc-200 shadow-sm ${imageSizeClass(q.explanationWrongImage.size || 'default')}`} style={{ maxHeight: '400px', objectFit: 'contain' }} />
                            </div>
                          )}
                        </div>
                    </div>
                  )}

                  {q.summary && (
                      <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#002b5c]/50 dark:text-blue-400/30 block mb-3">Key Summary</span>
                        {q.summaryImage?.data && q.summaryImage.placement === 'top' && (
                          <div className="mb-4 flex justify-center">
                            <img src={q.summaryImage.data} alt="Summary" loading="lazy" className={`rounded-xl border border-zinc-200 shadow-sm ${imageSizeClass(q.summaryImage.size || 'default')}`} style={{ maxHeight: '300px', objectFit: 'contain' }} />
                          </div>
                        )}
                        <InteractiveText text={`"${q.summary}"`} sectionImage={q.summaryImage?.data} gallery={q.gallery} className="font-bold text-[17px] leading-relaxed text-zinc-900 dark:text-zinc-200" />
                        {q.summaryImage?.data && (q.summaryImage.placement === 'bottom' || !q.summaryImage.placement) && (
                          <div className="mt-4 flex justify-center">
                            <img src={q.summaryImage.data} alt="Summary" loading="lazy" className={`rounded-xl border border-zinc-200 shadow-sm ${imageSizeClass(q.summaryImage.size || 'default')}`} style={{ maxHeight: '300px', objectFit: 'contain' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>



      {/* FOOTER */}
      <ExamFooter
        isReviewMode={isReviewMode}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        mode={mode}
        onEnd={handleFooterEnd}
        onSuspend={handleFooterSuspend}
        onOpenFeedback={handleOpenFeedback}
        onPrevious={handleFooterPrevious}
        onNext={handleFooterNext}
      />

      <style jsx global>{`
        body { overflow: hidden; }
        ::selection { background: #bfdbfe; color: #1e3a8a; }
      `}</style>

      {modal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001b3d]/60 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setModal({ ...modal, show: false })} />
          <div className="bg-white dark:bg-[#16161a] rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative max-w-[400px] w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300 border-none">
            {/* Header section based on type */}
            {modal.type === 'danger' && (
              <div className="bg-[#fffbeb] p-8 flex flex-col items-center border-b border-amber-100">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 shadow-[0_4px_10px_rgba(217,119,6,0.15)]">
                  <AlertTriangle size={32} className="text-amber-500" strokeWidth={2.5} />
                </div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-[#92400e] text-center">
                  {modal.title}
                </h3>
              </div>
            )}
            {modal.type === 'confirm' && (
              <div className="bg-emerald-50 p-8 flex flex-col items-center border-b border-emerald-100">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 shadow-[0_4px_10px_rgba(16,185,129,0.15)]">
                  <Check size={32} className="text-emerald-500" strokeWidth={2.5} />
                </div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-emerald-800 text-center">
                  {modal.title}
                </h3>
              </div>
            )}
            {modal.type === 'info' && (
              <div className="bg-blue-50 p-8 flex flex-col items-center border-b border-blue-100">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 shadow-[0_4px_10px_rgba(59,130,246,0.15)]">
                  <LogOut size={32} className="text-blue-500" strokeWidth={2.5} />
                </div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-blue-800 text-center">
                  {modal.title}
                </h3>
              </div>
            )}

            <div className="p-10 pt-8 bg-[#1e1e24] dark:bg-[#16161a]">
              <p className="text-[15px] font-medium leading-relaxed text-zinc-400 text-center mb-10">
                {modal.message}
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    modal.onConfirm();
                    setModal({ ...modal, show: false });
                  }}
                  className={`w-full py-4 rounded-xl text-[12px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${modal.type === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30'
                    : modal.type === 'confirm'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30'
                    : 'bg-[#1d46af] text-white hover:bg-[#16368a] shadow-blue-500/30'
                    }`}
                >
                  {modal.confirmText || 'Confirm & Continue'}
                </button>
                <button
                  onClick={() => setModal({ ...modal, show: false })}
                  className="w-full py-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsFeedbackOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-[#1B263B] mb-2">Send Feedback</h3>
            <p className="text-xs text-slate-500 mb-3">Include what happened on this question/session. Max 500 characters.</p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
              rows={6}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0066CC]"
              placeholder="Write your feedback..."
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-red-500">{feedbackError}</span>
              <span className="text-slate-400">{feedbackText.length}/500</span>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSendingFeedback}
                className="px-4 py-2 rounded-lg bg-[#0066CC] text-white text-sm font-semibold disabled:opacity-50"
              >
                {isSendingFeedback ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <h2 className="text-3xl font-bold mb-2">Test Suspended</h2>
          <p className="text-zinc-400 mb-8">Your progress and timer are saved.</p>
          <button
            onClick={() => {
              // unsavedSecondsRef does not need reset because timer was paused
              setIsPaused(false);
            }}
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-blue-500/30"
          >
            Resume Test
          </button>
        </div>
      )}
    </div>
  );
}
