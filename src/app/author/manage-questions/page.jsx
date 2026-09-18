"use client";

import { useEffect, useState, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { getAllQuestions, updateQuestion, addQuestion, getQuestionById, submitForReview, approveQuestion, publishQuestion, deprecateQuestion, reviseQuestion } from "@/services/question.service";
import { getAllProducts, getProductById } from "@/services/product.service";
import { useDeleteItem } from "@/hooks/useDeleteItem";
import { ChevronDown, Search, Filter, Database, ArrowUpDown, LayoutGrid, CheckCircle2, Clock, AlertTriangle, Archive, FileEdit, History, Download } from "lucide-react";
import GovernanceTimeline from "@/components/author/question/GovernanceTimeline";
import InteractiveText from "@/components/shared/InteractiveText";
import { AppContext } from "@/context/AppContext";
import BulkPasteImport from "@/components/author/question/BulkPasteImport";

function imageSizeClass(size) {
  if (size === "small") return "max-w-[240px] mx-auto rounded-lg border mt-3 block";
  if (size === "medium") return "max-w-[480px] mx-auto rounded-lg border mt-3 block";
  if (size === "large") return "max-w-[720px] mx-auto rounded-lg border mt-3 block";
  return "max-w-full mx-auto rounded-lg border mt-3 block";
}

export default function ManageQuestionsPage() {
  const router = useRouter();
  const { selectedAuthorProduct } = useContext(AppContext);
  const [ok, setOk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [filterSystem, setFilterSystem] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterStem, setFilterStem] = useState("");
  const [filterId, setFilterId] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState("");

  // Delete hook
  const { handleDelete: deleteQuestion, handleBulkDelete: bulkDeleteQuestions, isDeleting } = useDeleteItem(
    'question',
    setQuestions,
    setSelectedIds
  );

  const [packageFilter, setPackageFilter] = useState("");
  const [packageName, setPackageName] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 20;

  // Preview modal
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [previewTab, setPreviewTab] = useState('preview'); // 'preview' or 'history'
  // Reset whenever a new preview is opened
  useEffect(() => {
    setPreviewTab('preview');
  }, [previewQuestion]);

  const fileInputRef = useRef(null);

  // Universal Taxonomy Defaults
  const DEFAULT_SYSTEMS = [
    "Cardiovascular", "Respiratory", "Renal", "Gastrointestinal", "Neurology",
    "Musculoskeletal", "Endocrine", "Reproductive", "Hematology", "Dermatology", "Psychiatry", "Multisystem"
  ];
  const DEFAULT_SUBJECTS = [
    "Anatomy", "Physiology", "Biochemistry", "Pharmacology", "Pathology",
    "Microbiology", "Immunology", "Behavioral Science", "Genetics", "Biostatistics", "Epidemiology"
  ];

  const [availableSystems, setAvailableSystems] = useState(DEFAULT_SYSTEMS);
  const [availableSubjects, setAvailableSubjects] = useState(DEFAULT_SUBJECTS);

  // Auth & Filter Persistence
  useEffect(() => {
    // Legacy Password Check Removed: Authorization now handled by AuthorLayout
    setOk(true);

    const savedSortBy = localStorage.getItem("medbank_manage_questions_sortBy");
    if (savedSortBy) setSortBy(savedSortBy);

    const savedSystem = localStorage.getItem("medbank_manage_questions_filterSystem");
    if (savedSystem) setFilterSystem(savedSystem);

    const savedSubject = localStorage.getItem("medbank_manage_questions_filterSubject");
    if (savedSubject) setFilterSubject(savedSubject);

    const savedTopic = localStorage.getItem("medbank_manage_questions_filterTopic");
    if (savedTopic) setFilterTopic(savedTopic);

    const savedStem = localStorage.getItem("medbank_manage_questions_filterStem");
    if (savedStem) setFilterStem(savedStem);

    const savedId = localStorage.getItem("medbank_manage_questions_filterId");
    if (savedId) setFilterId(savedId);

    const savedStatus = localStorage.getItem("medbank_manage_questions_filterStatus");
    if (savedStatus) setFilterStatus(savedStatus);
  }, [router]);

  // Persist filters whenever they change
  useEffect(() => {
    if (ok) {
      localStorage.setItem("medbank_manage_questions_sortBy", sortBy);
      localStorage.setItem("medbank_manage_questions_filterSystem", filterSystem);
      localStorage.setItem("medbank_manage_questions_filterSubject", filterSubject);
      localStorage.setItem("medbank_manage_questions_filterTopic", filterTopic);
      localStorage.setItem("medbank_manage_questions_filterStem", filterStem);
      localStorage.setItem("medbank_manage_questions_filterId", filterId);
      localStorage.setItem("medbank_manage_questions_filterStatus", filterStatus);
    }
  }, [sortBy, filterSystem, filterSubject, filterTopic, filterStem, filterId, ok]);

  // Load questions
  const loadQuestions = async () => {
    if (!selectedAuthorProduct) return;
    setIsLoading(true);
    setError(null);
    try {
      const all = await getAllQuestions(selectedAuthorProduct.id);
      setQuestions(all || []);
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPackageDetails = async (id) => {
    try {
      const p = await getProductById(id);
      if (p) {
        setPackageName(p.name);
        setAvailableSystems(p.systems?.length > 0 ? p.systems : DEFAULT_SYSTEMS);
        setAvailableSubjects(p.subjects?.length > 0 ? p.subjects : DEFAULT_SUBJECTS);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Priority: Global Context
    if (selectedAuthorProduct) {
      setPackageFilter(selectedAuthorProduct.id.toString());
      setPackageName(selectedAuthorProduct.name);
      setAvailableSystems(selectedAuthorProduct.systems?.length > 0 ? selectedAuthorProduct.systems : DEFAULT_SYSTEMS);
      setAvailableSubjects(selectedAuthorProduct.subjects?.length > 0 ? selectedAuthorProduct.subjects : DEFAULT_SUBJECTS);
      loadQuestions();
    } else {
      // Fallback for direct URL access if global context isn't ready
      const pId = new URLSearchParams(window.location.search).get("packageId");
      if (pId) {
        setPackageFilter(pId);
        loadPackageDetails(pId);
        (async () => {
          setIsLoading(true);
          try {
            const all = await getAllQuestions(pId);
            setQuestions(all || []);
          } catch (e) { }
          setIsLoading(false);
        })();
      } else {
        setPackageFilter("");
        setPackageName("");
        setAvailableSystems(DEFAULT_SYSTEMS);
        setAvailableSubjects(DEFAULT_SUBJECTS);
        setQuestions([]);
      }
    }
  }, [selectedAuthorProduct]);

  // Governance Actions
  const handleSubmit = async (id) => {
    const notes = prompt("Add submission notes (optional):");
    if (notes === null) return;
    try {
      await submitForReview(id, notes);
      await loadQuestions();
    } catch (err) {
      alert("Submission failed: " + err.message);
    }
  };

  const handleApprove = async (id) => {
    const notes = prompt("Add approval notes (optional):");
    if (notes === null) return;
    try {
      await approveQuestion(id, notes);
      await loadQuestions();
    } catch (err) {
      alert("Approval failed: " + err.message);
    }
  };

  // Publish a draft/approved version
  const handlePublish = async (id) => {
    if (!confirm("Publish this question? It will become live for students.")) return;
    try {
      await publishQuestion(id, "Manually published from dashboard");
      await loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to publish: " + err.message);
    }
  };

  const handleDeprecate = async (id) => {
    const reason = prompt("Why are you deprecating this question?");
    if (!reason) return;
    try {
      await deprecateQuestion(id, reason);
      await loadQuestions();
    } catch (err) {
      alert("Deprecation failed: " + err.message);
    }
  };

  // Revise a published question
  const handleRevise = async (id) => {
    const notes = prompt("Why are you revising this? (optional):");
    if (notes === null) return;
    try {
      const newDraft = await reviseQuestion(id, notes);
      router.push(`/author/create-question?id=${newDraft.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create revision: " + err.message);
    }
  };

  // Delete with confirmation
  const handleDelete = async (id) => {
    await deleteQuestion(id);
  };

  // Selection logic
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allOnPage = paginated.map(q => q.id);
    const someUnselected = allOnPage.some(id => !selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (someUnselected) {
        allOnPage.forEach(id => next.add(id));
      } else {
        allOnPage.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  // Bulk actions updated for lifecycle
  const bulkPublish = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return alert("Please select questions first");
    const drafts = ids.filter(id => questions.find(q => q.id === id)?.status === 'draft');
    if (drafts.length === 0) return alert("No drafts selected to publish");
    
    if (!confirm(`Publish ${drafts.length} selected draft(s)?`)) return;

    try {
      setIsLoading(true);
      const { publishQuestion } = await import("@/services/question.service");
      await Promise.all(drafts.map(id => publishQuestion(id)));
      setSelectedIds(new Set());
      await loadQuestions();
      alert(`Published ${drafts.length} questions`);
    } catch (err) {
      alert("Bulk publish failed");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    
    try {
      setIsLoading(true);
      await bulkDeleteQuestions(ids);
    } finally {
      setIsLoading(false);
    }
  };

  // Export to JSON
  const handleExport = () => {
    const dataToExport = filteredQuestions.length > 0 ? filteredQuestions : questions;
    if (dataToExport.length === 0) return alert("No data available to export");

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medbank-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const dataToExport = filteredQuestions.length > 0 ? filteredQuestions : questions;
    if (dataToExport.length === 0) return alert("No data available to export");

    const headers = [
      "id", "productId", "packageId", "conceptId", "system", "subject", "topic", "stem", "choices", "correct",
      "explanationCorrect", "explanationWrong", "summary",
      "stemImage", "explanationCorrectImage", "explanationWrongImage", "summaryImage",
      "gallery", "tags", "references", "cognitiveLevel", "status", "versionNumber", "published"
    ];

    const rows = dataToExport.map(q => headers.map(h => {
      let val = q[h];
      if (h === 'choices' || typeof val === 'object') {
        val = JSON.stringify(val || []);
      }
      let str = String(val ?? "");
      return `"${str.replace(/"/g, '""')}"`;
    }).join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medbank-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCheckedCSV = () => {
    if (selectedIds.size === 0) return alert("Please select questions first");

    const dataToExport = questions.filter(q => selectedIds.has(q.id));

    const headers = [
      "id", "productId", "packageId", "conceptId", "system", "subject", "topic", "stem", "choices", "correct",
      "explanationCorrect", "explanationWrong", "summary",
      "stemImage", "explanationCorrectImage", "explanationWrongImage", "summaryImage",
      "gallery", "tags", "references", "cognitiveLevel", "status", "versionNumber", "published"
    ];

    const rows = dataToExport.map(q => headers.map(h => {
      let val = q[h];
      if (h === 'choices' || typeof val === 'object') {
        val = JSON.stringify(val || []);
      }
      let str = String(val ?? "");
      return `"${str.replace(/"/g, '""')}"`;
    }).join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `checked-questions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import from JSON or CSV
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let imported = [];
        const content = event.target.result;

        if (file.name.endsWith('.json')) {
          imported = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && l !== '```csv' && l !== '```');
          if (lines.length === 0) throw new Error("CSV file is empty");

          const parseCSVLine = (line) => {
            const result = [];
            let cell = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  cell += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                result.push(cell);
                cell = '';
              } else {
                cell += char;
              }
            }
            result.push(cell);
            return result;
          };

          const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));
          console.log("Importing CSV with headers:", headers);

          imported = lines.slice(1).map((line, lineIdx) => {
            const values = parseCSVLine(line);
            const obj = {};
            headers.forEach((h, i) => {
              let val = (values[i] || "").trim();

              if (h === 'published') {
                val = val.toLowerCase() === 'true' || val === '1' || val === 'TRUE';
              } else {
                const jsonFields = ['choices', 'stemImage', 'explanationCorrectImage', 'explanationWrongImage', 'summaryImage', 'tags', 'choiceDistribution', 'gallery'];
                if (jsonFields.includes(h)) {
                  if (val) {
                    try {
                      const jsonStr = val.startsWith('"') && val.endsWith('"')
                        ? val.slice(1, -1).replace(/""/g, '"')
                        : val;
                      val = JSON.parse(jsonStr);
                    } catch (e) {
                      console.warn(`Line ${lineIdx + 2}: Failed to parse ${h}. Value:`, val);
                      val = h === 'choices' || h === 'tags' ? [] : {};
                    }
                  } else {
                    val = h === 'choices' || h === 'tags' ? [] : {};
                  }
                }
              }
              obj[h] = val;
            });
            return obj;
          });
        }

        if (!Array.isArray(imported)) throw new Error("Invalid format: Expected an array");

        const hasUnscopedNewQuestion = imported.some((q) => {
          if (!q?.id) return false;
          const exists = questions.some((existing) => existing.id === q.id);
          if (exists) return false;
          return !(q.packageId || q.productId || selectedAuthorProduct?.id);
        });

        if (hasUnscopedNewQuestion) {
          throw new Error("Select an author product before importing new questions, or include packageId/productId columns in your file.");
        }

        let added = 0;
        let updated = 0;
        let skipped = 0;
        setIsLoading(true);

        for (const q of imported) {
          if (typeof q.stem === 'string') q.stem = q.stem.trim();
          if ((!q.stem || q.stem.length === 0) && typeof q.question === 'string') {
            q.stem = q.question.trim();
          }

          // STRICT MODE: If a global product is selected, enforce it!
          if (selectedAuthorProduct) {
            q.packageId = selectedAuthorProduct.id;
            q.productId = selectedAuthorProduct.id;
          }

          if (!q.productId && q.packageId) q.productId = q.packageId;
          if (!q.packageId && q.productId) q.packageId = q.productId;

          if (!q.id) {
            skipped++;
            continue;
          }

          try {
            const exists = questions.find(existing => existing.id === q.id);
            if (exists) {
              const updatePayload = {
                ...exists,
                ...q,
                packageId: q.packageId || q.productId || exists.packageId || exists.productId,
                productId: q.productId || q.packageId || exists.productId || exists.packageId,
              };

              if (!updatePayload.packageId || !updatePayload.system || !updatePayload.subject) {
                skipped++;
                continue;
              }

              await updateQuestion(updatePayload);
              updated++;
            } else {
              const hasRequiredCreateFields =
                !!q.stem &&
                !!q.system &&
                !!q.subject &&
                !!(q.packageId || q.productId) &&
                Array.isArray(q.choices) &&
                !!q.correct;

              if (!hasRequiredCreateFields) {
                skipped++;
                continue;
              }

              await addQuestion(q);
              added++;
            }
          } catch (err) {
            console.error(`Error processing question ${q.id}:`, err);
          }
        }

        alert(`Bulk Import Complete!\n──────────────────\nNew Records: ${added}\nUpdated: ${updated}\nSkipped: ${skipped}`);
        loadQuestions();
      } catch (err) {
        console.error(err);
        alert("Import failed: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Sorting & Filtering
  const sortedQuestions = [...questions].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const filteredQuestions = sortedQuestions.filter(q => {
    const matchesId = !filterId || String(q.id).toLowerCase().includes(filterId.toLowerCase());
    return matchesId && (
      (!filterSystem || q.system === filterSystem) &&
      (!filterSubject || q.subject === filterSubject) &&
      (!filterStatus || q.status === filterStatus) &&
      (!filterTopic || q.topic?.toLowerCase().includes(filterTopic.toLowerCase())) &&
      (!filterStem || q.stem?.toLowerCase().includes(filterStem.toLowerCase())) &&
      (!packageFilter ||
        (q.packageId && String(q.packageId).replace(/\.0$/, '') === String(packageFilter).replace(/\.0$/, '')) ||
        (q.productId && String(q.productId).replace(/\.0$/, '') === String(packageFilter).replace(/\.0$/, ''))
      )
    );
  });

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const paginated = filteredQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  if (!ok) return null;

  return (
    <div className="font-body min-h-screen bg-[#F1F4F7] relative overflow-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#005EB8]/5 pointer-events-none" />
      <main className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-heading font-black tracking-tight text-[#1B263B]">Question <span className="text-[#005EB8]">Bank</span></h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Manage your educational content, import/export data, and monitor question status</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleExport} className="px-6 py-2.5 bg-background border border-border text-foreground rounded-2xl hover:bg-panel text-xs font-bold transition-all shadow-sm">
              Export JSON
            </button>
            <button onClick={handleExportCSV} className="px-6 py-2.5 bg-background border border-border text-foreground rounded-2xl hover:bg-panel text-xs font-bold transition-all shadow-sm">
              Export CSV
            </button>
            <label className="px-6 py-2.5 bg-white border-2 border-primary/20 text-primary rounded-2xl hover:bg-primary hover:text-white text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-md group border-dashed hover:border-solid">
              <span className="flex items-center gap-2">
                <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                Import File
              </span>
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleImport}
                ref={fileInputRef}
              />
            </label>
            <BulkPasteImport
              onImport={async (q) => { await addQuestion(q); }}
              onComplete={() => loadQuestions()}
              selectedProduct={selectedAuthorProduct}
              availableSystems={availableSystems}
              availableSubjects={availableSubjects}
            />
            {selectedIds.size > 0 && (
              <button
                onClick={handleExportCheckedCSV}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
              >
                <Download size={14} />
                Download CSV ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6 mt-4 p-4 bg-white/50 border border-slate-200 rounded-[24px] backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
              <div className="w-1.5 h-6 bg-[#0066CC] rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Pool:</span>
              <span className="text-sm font-black text-[#1B263B]">{questions.length}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0066CC]/5 border border-[#0066CC]/10 rounded-xl shadow-sm">
              <div className="w-1.5 h-6 bg-[#0066CC] rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-[#0066CC] uppercase tracking-widest">Active Stream:</span>
              <span className="text-sm font-black text-[#0066CC]">{filteredQuestions.length}</span>
            </div>

          </div>
          {packageName && (
            <div className="flex items-center gap-2 bg-[#005EB8]/10 text-[#005EB8] px-4 py-1.5 rounded-full border border-[#005EB8]/20 animate-in fade-in slide-in-from-left-4 duration-500">
              <Database size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {selectedAuthorProduct ? 'LOCKED CONTEXT:' : 'Package:'} {packageName}
              </span>
              {!selectedAuthorProduct && (
                <button onClick={() => { setPackageFilter(""); setPackageName(""); }} className="ml-1 hover:text-red-500 opacity-70">×</button>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filterSystem} onChange={e => { setFilterSystem(e.target.value); setCurrentPage(1); }} className="bg-white text-[#1B263B] border border-slate-200 p-2.5 rounded-xl min-w-[160px] focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all hover:bg-slate-50 shadow-sm">
            <option value="">All Systems</option>
            {availableSystems.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setCurrentPage(1); }} className="bg-white text-[#1B263B] border border-slate-200 p-2.5 rounded-xl min-w-[160px] focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all hover:bg-slate-50 shadow-sm">
            <option value="">All Subjects</option>
            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="bg-white text-[#1B263B] border border-slate-200 p-2.5 rounded-xl min-w-[160px] focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all hover:bg-slate-50 shadow-sm">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="deprecated">Deprecated</option>
          </select>

          <input placeholder="Filter Topic" value={filterTopic} onChange={e => { setFilterTopic(e.target.value); setCurrentPage(1); }} className="bg-white text-[#1B263B] border border-slate-200 p-2.5 rounded-xl min-w-[160px] focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all hover:bg-slate-50 shadow-sm" />

          <input placeholder="Filter Stem" value={filterStem} onChange={e => { setFilterStem(e.target.value); setCurrentPage(1); }} className="bg-white text-[#1B263B] border border-slate-200 p-2.5 rounded-xl min-w-[200px] flex-1 focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all shadow-sm" />

          <div className="relative flex-1 min-w-[140px]">
            <input
              placeholder="Search ID..."
              value={filterId}
              onChange={e => { setFilterId(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white text-[#1B263B] border border-slate-200 p-2.5 pl-10 rounded-xl focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all shadow-sm"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative group">
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }} className="bg-card text-foreground border border-border p-2 rounded-xl min-w-[140px] focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none pr-8">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <ChevronDown size={14} />
            </div>
          </div>



          <button onClick={() => {
            setFilterSystem("");
            setFilterSubject("");
            setFilterTopic("");
            setFilterStem("");
            setFilterId("");
            setFilterStatus("");
            setPackageFilter("");
            setPackageName("");

            // Remove packageId from URL without full reload
            const url = new URL(window.location);
            url.searchParams.delete('packageId');
            window.history.pushState({}, '', url);

            setCurrentPage(1);
          }} className="px-6 py-2.5 bg-panel hover:bg-border/50 text-foreground rounded-2xl text-xs font-bold transition-all border border-border">
            Clear Filters
          </button>

          <div className="flex flex-wrap gap-2 mt-4 w-full">
            <button
              onClick={bulkPublish}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-30"
              disabled={selectedIds.size === 0}
            >
              Bulk Publish Drafts
            </button>
            <button
              onClick={bulkDelete}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-30"
              disabled={selectedIds.size === 0}
            >
              Bulk Delete
            </button>
            {selectedIds.size > 0 && (
              <span className="ml-2 text-xs font-bold text-muted-foreground flex items-center">
                {selectedIds.size} Selected
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 opacity-50 bg-card rounded-2xl border border-border">No questions found</div>
        ) : (
          <>
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-[0_15px_40px_rgba(0,0,94,0.04)] mb-6">
                    <table className="w-full divide-y divide-border" style={{ minWidth: '700px' }}>
                      <thead className="bg-panel font-bold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                  <tr>
                          <th className="px-3 py-3 text-left sticky left-0 bg-[#f8fafc] z-10">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                              checked={paginated.length > 0 && paginated.every(q => selectedIds.has(q.id))}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th className="px-3 py-3 text-left sticky left-[40px] bg-[#f8fafc] z-10">ID</th>
                          <th className="px-3 py-3">System</th>
                          <th className="px-2 py-3" style={{ maxWidth: '120px' }}>Category</th>
                          <th className="px-3 py-3">Stem</th>
                          <th className="px-3 py-3">Created</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right sticky right-0 bg-[#f8fafc] z-10">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(q => (
                    <tr key={q.id} className={`hover:bg-[#EAF1F7]/50 transition-all border-b border-slate-100 last:border-0 group cursor-default ${selectedIds.has(q.id) ? 'bg-[#0066CC]/5' : ''}`}>
                      <td className="px-3 py-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-[#EAF1F7]/50 z-10 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs font-mono text-muted-foreground sticky left-[40px] bg-white group-hover:bg-[#EAF1F7]/50 z-10 transition-colors">{q.id.substring(0, 8)}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs font-bold text-foreground opacity-80">{q.system || '-'}</td>
                      <td className="px-2 py-4" style={{ maxWidth: '120px' }}>
                        <div className="text-xs font-bold text-foreground truncate">{q.subject}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-medium truncate">{q.topic || '-'}</div>
                      </td>
                      <td className="px-3 py-4 max-w-[200px]">
                        <div className="line-clamp-1 text-sm text-foreground/80 group-hover:text-primary transition-colors" title={q.stem}>
                          {q.stem?.substring(0, 60) || "No stem"}{q.stem?.length > 60 ? '...' : ''}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                          q.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 
                          q.status === 'draft' ? 'bg-amber-100 text-amber-700' : 
                          q.status === 'review' ? 'bg-blue-100 text-blue-700' :
                          q.status === 'approved' ? 'bg-indigo-100 text-indigo-700' :
                          q.status === 'deprecated' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {q.status === 'published' && <CheckCircle2 size={10} />}
                          {q.status === 'review' && <Clock size={10} />}
                          {q.status === 'draft' && <FileEdit size={10} />}
                          {q.status === 'approved' && <CheckCircle2 size={10} />}
                          {q.status === 'deprecated' && <AlertTriangle size={10} />}
                          {q.status || 'Draft'} {q.versionNumber ? `v${q.versionNumber}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-[#EAF1F7]/50 z-10 transition-colors">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/author/create-question?id=${q.id}`)}
                            className="p-1 px-2.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-200 transition-colors uppercase"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="p-1 px-2.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-200 transition-colors uppercase"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 mt-8 font-mono text-sm">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-6 py-2 border border-border bg-card hover:bg-accent transition-all rounded-xl disabled:opacity-30">
                  PREV
                </button>
                <span className="opacity-60">PAGE {currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-6 py-2 border border-border bg-card hover:bg-accent transition-all rounded-xl disabled:opacity-30">
                  NEXT
                </button>
              </div>
            )}
          </>
        )
        }

        {/* Preview Modal */}
        {previewQuestion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewQuestion(null)}>
            <div className="bg-card text-card-foreground rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-border relative" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-heading font-black text-foreground mb-6 uppercase tracking-tight flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-8 bg-primary rounded-full" />
                  Previewing <span className="text-primary">Question</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPreviewTab('preview')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${previewTab === 'preview' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-panel text-slate-400 hover:bg-border/20'}`}>Content</button>
                  <button onClick={() => setPreviewTab('history')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${previewTab === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-panel text-slate-400 hover:bg-border/20'}`}>Audit Trail</button>
                </div>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                <div><strong>System:</strong> {previewQuestion.system || '-'}</div>
                <div><strong>Subject:</strong> {previewQuestion.subject || '-'}</div>
                <div><strong>Topic:</strong> {previewQuestion.topic || '-'}</div>
                <div>
                  <strong>Status:</strong> 
                  <span className="ml-2 font-black uppercase text-[10px] text-primary">{previewQuestion.status || 'Draft'}</span>
                </div>
              </div>

              {previewTab === 'history' ? (
                <div className="bg-panel/50 rounded-2xl p-6 border border-border">
                  <GovernanceTimeline versionId={previewQuestion.id} conceptId={previewQuestion.conceptId} />
                </div>
              ) : (
                <>
                {/* Content... existing content moved here */}

              {/* Stem */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-2 text-foreground">Stem</h3>
                      {previewQuestion.stemImage?.data && previewQuestion.stemImage.placement === 'top' && (
                        <img src={previewQuestion.stemImage.data} alt="Stem" className={`rounded-xl shadow-lg border border-border mb-4 ${imageSizeClass(previewQuestion.stemImage.size || "default")}`} />
                      )}
                      <div className="mb-4 text-muted-foreground">
                        {(previewQuestion.stem || '').split('\n').map((para, i) => (
                          <InteractiveText key={i} text={para} sectionImage={previewQuestion.stemImage?.data} gallery={previewQuestion.gallery} className="mb-2" />
                        ))}
                      </div>
                      {previewQuestion.stemImage?.data && (previewQuestion.stemImage.placement === 'bottom' || !previewQuestion.stemImage.placement) && (
                        <img src={previewQuestion.stemImage.data} alt="Stem" className={`rounded-xl shadow-lg border border-border ${imageSizeClass(previewQuestion.stemImage.size || "default")}`} />
                      )}
              </div>

              {/* Choices */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-3">Choices</h3>

                      {previewQuestion.matrixColumns?.length > 0 && (
                        <div className="flex gap-4 mb-2 pl-12 pr-4">
                          {previewQuestion.matrixPlacement === 'after' && !previewQuestion.hideOptionText && <div className="flex-1" />}
                          {previewQuestion.matrixColumns.map((col, idx) => (
                            <div key={idx} className={`text-[14px] font-black uppercase text-center flex items-center justify-center rounded-lg bg-transparent p-2 ${col.vertical ? 'w-24' : 'w-40'}`}>
                              {col.label}
                            </div>
                          ))}
                          {previewQuestion.matrixPlacement === 'before' && !previewQuestion.hideOptionText && <div className="flex-1" />}
                        </div>
                      )}

                <div className="space-y-4">
                  {previewQuestion.choices?.map((c, i) => (
                    <div key={i} className={`flex gap-4 items-start ${previewQuestion.correct === String.fromCharCode(65 + i) ? 'bg-emerald-500/5 p-2 rounded-xl transition-colors' : 'p-2'}`}>
                      <span className={`font-bold w-3 text-[11px] shrink-0 ${previewQuestion.correct === String.fromCharCode(65 + i) ? 'text-emerald-600' : ''}`}>{String.fromCharCode(65 + i)}.</span>

                      <div className="flex-1 flex gap-4 min-h-[38px]">
                        {/* Option Text (if After) */}
                        {previewQuestion.matrixPlacement === 'after' && !previewQuestion.hideOptionText && (
                          <div className="flex-1 text-sm">
                            <InteractiveText text={c.text} sectionImage={c.image?.data} className="mb-2" />
                            {c.image?.data && (
                              <img src={c.image.data} alt={`Choice ${String.fromCharCode(65 + i)}`} className={`rounded-xl shadow-md border border-border ${imageSizeClass(c.image.size || "default")}`} />
                            )}
                          </div>
                        )}

                        {/* Matrix Values */}
                        <div className="flex gap-2">
                          {previewQuestion.matrixColumns?.map((col, idx) => (
                            <div key={idx} className={`flex items-center justify-center text-[16px] font-medium text-zinc-900 dark:text-zinc-200 bg-transparent rounded-lg ${col.vertical ? 'w-24' : 'w-40'}`}>
                              {c.matrixValues?.[idx] || ""}
                            </div>
                          ))}
                        </div>

                        {/* Option Text (if Before) */}
                        {previewQuestion.matrixPlacement === 'before' && !previewQuestion.hideOptionText && (
                          <div className="flex-1 text-sm pl-4 border-l border-border/50">
                            <InteractiveText text={c.text} sectionImage={c.image?.data} className="mb-2" />
                            {c.image?.data && (
                              <img src={c.image.data} alt={`Choice ${String.fromCharCode(65 + i)}`} className={`rounded-xl shadow-md border border-border ${imageSizeClass(c.image.size || "default")}`} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanations */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Explanations</h3>
                {previewQuestion.explanationCorrect && (
                  <div className="mb-6">
                    <p className="font-medium mb-2">Correct:</p>
                          {previewQuestion.explanationCorrectImage?.data && previewQuestion.explanationCorrectImage.placement === 'top' && (
                            <img src={previewQuestion.explanationCorrectImage.data} alt="Correct" className={`mb-3 rounded-xl shadow-md border border-border ${imageSizeClass(previewQuestion.explanationCorrectImage.size || "default")}`} />
                          )}
                          <div className="text-zinc-800 dark:text-zinc-200">
                            {(previewQuestion.explanationCorrect || '').split('\n').map((para, i) => (
                              <InteractiveText key={i} text={para} sectionImage={previewQuestion.explanationCorrectImage?.data} gallery={previewQuestion.gallery} className="mb-2" />
                            ))}
                          </div>
                          {previewQuestion.explanationCorrectImage?.data && (previewQuestion.explanationCorrectImage.placement === 'bottom' || !previewQuestion.explanationCorrectImage.placement) && (
                            <img src={previewQuestion.explanationCorrectImage.data} alt="Correct" className={`mt-3 rounded-xl shadow-md border border-border ${imageSizeClass(previewQuestion.explanationCorrectImage.size || "default")}`} />
                          )}
                  </div>
                )}
                {previewQuestion.explanationWrong && (
                  <div className="mb-6">
                    <p className="font-medium mb-2">Wrong:</p>
                          {previewQuestion.explanationWrongImage?.data && previewQuestion.explanationWrongImage.placement === 'top' && (
                            <img src={previewQuestion.explanationWrongImage.data} alt="Wrong" className={`mb-3 rounded-xl shadow-md border border-border ${imageSizeClass(previewQuestion.explanationWrongImage.size || "default")}`} />
                          )}
                          <div className="text-zinc-800 dark:text-zinc-200">
                            {(previewQuestion.explanationWrong || '').split('\n').map((para, i) => (
                              <InteractiveText key={i} text={para} sectionImage={previewQuestion.explanationWrongImage?.data} gallery={previewQuestion.gallery} className="mb-2" />
                            ))}
                          </div>
                          {previewQuestion.explanationWrongImage?.data && (previewQuestion.explanationWrongImage.placement === 'bottom' || !previewQuestion.explanationWrongImage.placement) && (
                            <img src={previewQuestion.explanationWrongImage.data} alt="Wrong" className={`mt-3 rounded-xl shadow-md border border-border ${imageSizeClass(previewQuestion.explanationWrongImage.size || "default")}`} />
                          )}
                  </div>
                )}
                {previewQuestion.summary && (
                  <div>
                    <p className="font-medium mb-2">Summary:</p>
                          {previewQuestion.summaryImage?.data && previewQuestion.summaryImage.placement === 'top' && (
                            <img src={previewQuestion.summaryImage.data} alt="Summary" className={`mb-3 rounded-xl shadow-md border border-border ${imageSizeClass(previewQuestion.summaryImage.size || "default")}`} />
                          )}
                          <div className="text-zinc-800 dark:text-zinc-200 font-bold italic">
                            <InteractiveText text={previewQuestion.summary} sectionImage={previewQuestion.summaryImage?.data} gallery={previewQuestion.gallery} />
                          </div>
                          {previewQuestion.summaryImage?.data && (previewQuestion.summaryImage.placement === 'bottom' || !previewQuestion.summaryImage.placement) && (
                            <img src={previewQuestion.summaryImage.data} alt="Summary" className={`mt-3 rounded-xl shadow-md border border-border ${imageSizeClass(previewQuestion.summaryImage.size || "default")}`} />
                          )}
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
