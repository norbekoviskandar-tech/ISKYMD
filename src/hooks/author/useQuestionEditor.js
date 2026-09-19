"use client";

import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addQuestion, getQuestionById, updateQuestion } from "@/services/question.service";
import Question from "@/models/question.model";
import { AppContext } from "@/context/AppContext";
import { createClient } from '@supabase/supabase-js';

/* ---------- Helpers ---------- */
export function imageSizeClass(size) {
  if (size === "small") return "max-w-[240px] mx-auto rounded-lg border mt-3 block";
  if (size === "medium") return "max-w-[480px] mx-auto rounded-lg border mt-3 block";
  if (size === "large") return "max-w-[720px] mx-auto rounded-lg border mt-3 block";
  return "max-w-full mx-auto rounded-lg border mt-3 block";
}

export function fileToBase64(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => callback(reader.result);
  reader.readAsDataURL(file);
}

// Supabase Storage upload function
async function uploadImageToStorage(file, questionId, imageType) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Storage not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const BUCKET_NAME = 'question-images';
    
    // Compress image using browser's canvas
    const compressedFile = await compressImage(file);
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = 'webp';
    const filename = `${questionId}-${imageType}-${timestamp}.${extension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, compressedFile, {
        contentType: 'image/webp',
        upsert: true
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);
    
    return publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
}

// Compress image using browser canvas
async function compressImage(file, maxWidth = 1400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Canvas compression failed'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function useAutoResizeTextarea(value) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return ref;
}

export function useQuestionEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedAuthorProduct } = useContext(AppContext);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});

  const [questionId, setQuestionId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [status, setStatus] = useState("draft");
  const [originalCreatedAt, setOriginalCreatedAt] = useState(Date.now());
  const [version, setVersion] = useState(1);
  const [lastSaved, setLastSaved] = useState(null);

  // Meta
  const [system, setSystem] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [packageId, setPackageId] = useState("");

  // Content
  const [stem, setStem] = useState("");
  const [stemImage, setStemImage] = useState({ data: "", size: "default", fileName: "", placement: "bottom" });
  const [matrixColumns, setMatrixColumns] = useState([]); // Array of { id: string, label: string, vertical: boolean }
  const [matrixPlacement, setMatrixPlacement] = useState("after"); // 'before' or 'after' choice text
  const [hideOptionText, setHideOptionText] = useState(false);
  const [choices, setChoices] = useState(
    Array(5).fill().map(() => ({
      text: "",
      image: { data: "", size: "default", fileName: "", placement: "bottom" },
      matrixValues: [] // Matching matrixColumns length
    }))
  );
  const [correctIndex, setCorrectIndex] = useState(0);

  // Explanations
  const [explanationCorrect, setExplanationCorrect] = useState("");
  const [explanationCorrectImage, setExplanationCorrectImage] = useState({ data: "", size: "default", fileName: "", placement: "bottom" });
  const [explanationWrong, setExplanationWrong] = useState("");
  const [explanationWrongImage, setExplanationWrongImage] = useState({ data: "", size: "default", fileName: "", placement: "bottom" });
  const [summary, setSummary] = useState("");
  const [summaryImage, setSummaryImage] = useState({ data: "", size: "default", fileName: "", placement: "bottom" });

  const [references, setReferences] = useState("");
  const [tags, setTags] = useState("");
  const [gallery, setGallery] = useState({});

  // Auto-suggest
  const [suggestion, setSuggestion] = useState(null);
  const [activeField, setActiveField] = useState(null);

  // Taxonomy
  const STANDARD_SYSTEMS = [
    "Cardiovascular", "Respiratory", "Renal", "Gastrointestinal", "Neurology",
    "Musculoskeletal", "Endocrine", "Reproductive", "Hematology", "Dermatology", "Psychiatry", "Multisystem"
  ];
  const STANDARD_SUBJECTS = [
    "Anatomy", "Physiology", "Biochemistry", "Pharmacology", "Pathology",
    "Microbiology", "Immunology", "Behavioral Science", "Genetics", "Biostatistics", "Epidemiology"
  ];
  const [availableSystems, setAvailableSystems] = useState(STANDARD_SYSTEMS);
  const [availableSubjects, setAvailableSubjects] = useState(STANDARD_SUBJECTS);

  useEffect(() => {
    if (selectedAuthorProduct) {
      setAvailableSystems(selectedAuthorProduct.systems?.length > 0 ? selectedAuthorProduct.systems : STANDARD_SYSTEMS);
      setAvailableSubjects(selectedAuthorProduct.subjects?.length > 0 ? selectedAuthorProduct.subjects : STANDARD_SUBJECTS);
      setPackageId(selectedAuthorProduct.id.toString());
    }
  }, [selectedAuthorProduct]);

  useEffect(() => {
    // Legacy Password Check Removed: Authorization now handled by AuthorLayout
    setIsAuthorized(true);
    setSystem(localStorage.getItem("author-system") || "");
    setSubject(localStorage.getItem("author-subject") || "");
  }, [router]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const q = await getQuestionById(id);
        if (!q) {
          router.push("/author/manage-questions");
          return;
        }
        setIsEditing(true);
        setQuestionId(q.id);
        setConceptId(q.conceptId || "");
        setStatus(q.status || "draft");
        setOriginalCreatedAt(q.createdAt || Date.now());
        setTopic(q.topic || "");
        setStem(q.stem || "");
        setStemImage(q.stemImage || { data: "", size: "default", fileName: "", placement: "bottom" });
        setSystem(q.system || "");
        setSubject(q.subject || "");
        setMatrixColumns(q.matrixColumns || []);
        setMatrixPlacement(q.matrixPlacement || "after");
        setHideOptionText(q.hideOptionText || false);
        const loadedChoices = (q.choices || []).map(ch => ({
          text: ch.text || "",
          image: ch.image || { data: "", size: "default", fileName: "", placement: "bottom" },
          matrixValues: ch.matrixValues || []
        }));
        // If it's a new question (empty choices) we default to 5, but if we loaded data, we keep as is.
        if (loadedChoices.length === 0) {
          while (loadedChoices.length < 5) loadedChoices.push({
            text: "",
            image: { data: "", size: "default", fileName: "", placement: "bottom" },
            matrixValues: (q.matrixColumns || []).map(() => "")
          });
        }
        setChoices(loadedChoices);
        setCorrectIndex(q.correct ? q.correct.charCodeAt(0) - 65 : 0);
        setExplanationCorrect(q.explanationCorrect || "");
        setExplanationCorrectImage(q.explanationCorrectImage || { data: "", size: "default", fileName: "", placement: "bottom" });
        setExplanationWrong(q.explanationWrong || "");
        setExplanationWrongImage(q.explanationWrongImage || { data: "", size: "default", fileName: "", placement: "bottom" });
        setSummary(q.summary || "");
        setSummaryImage(q.summaryImage || { data: "", size: "default", fileName: "", placement: "bottom" });
        setReferences(q.references || "");
        setTags(Array.isArray(q.tags) ? q.tags.join(", ") : "");
        setPackageId(q.packageId || "");
        const loadedGallery = (q.gallery && typeof q.gallery === 'object') ? q.gallery : {};
        // Migrate legacy simple base64 strings if necessary
        const normalizedGallery = {};
        Object.entries(loadedGallery).forEach(([id, val]) => {
          if (typeof val === 'string') {
            normalizedGallery[id] = { data: val, size: 'default', placement: 'bottom', variant: 'interactive' };
          } else {
            normalizedGallery[id] = { ...val, variant: val.variant || 'interactive' };
          }
        });
        setGallery(normalizedGallery);
        setVersion(q.versionNumber || 1);
      } catch (err) {
        setLoadError("Failed to load question");
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, router]);

  useEffect(() => { localStorage.setItem("author-system", system); }, [system]);
  useEffect(() => { localStorage.setItem("author-subject", subject); }, [subject]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!questionId.trim()) newErrors.questionId = "Question ID required";
    if (!stem.trim()) newErrors.stem = "Question stem required";
    if (!system.trim()) newErrors.system = "System required";
    if (!subject.trim()) newErrors.subject = "Subject required";
    if (!selectedAuthorProduct) newErrors.product = "Product must be selected";
    choices.forEach((c, i) => {
      const hasMatrixContent = (c.matrixValues || []).some(v => v && v.trim() !== "");
      if (!c.text.trim() && !hasMatrixContent) {
        newErrors[`choice${i}`] = `Choice ${String.fromCharCode(65 + i)} required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [questionId, stem, system, subject, choices, selectedAuthorProduct]);

  const saveQuestion = useCallback(async (shouldPublish = false) => {
    const isValid = validate();
    if (!isValid) {
      console.log("Validation errors:", errors);
      alert("Please fix the highlighted errors first.");
      return;
    }



    const action = shouldPublish ? "publish" : "save draft";
    if (!confirm(`Are you sure you want to ${action}?`)) return;

    console.log("Saving question with data:", {
      questionId,
      system,
      subject,
      topic,
      selectedAuthorProduct,
      packageId: selectedAuthorProduct ? selectedAuthorProduct.id : packageId
    });

    const q = {
      id: questionId,
      conceptId: conceptId || null,
      stem,
      stemImage,
      choices: choices.map((c, i) => ({
        id: String.fromCharCode(65 + i),
        text: c.text,
        image: c.image,
        matrixValues: c.matrixValues || []
      })),
      matrixColumns,
      matrixPlacement,
      hideOptionText,
      correct: String.fromCharCode(65 + correctIndex),
      explanationCorrect,
      explanationCorrectImage,
      explanationWrong,
      explanationWrongImage,
      summary,
      summaryImage,
      system,
      subject,
      topic: topic.trim() || "Mixed",
      status: shouldPublish ? 'published' : 'draft',
      published: shouldPublish ? 1 : 0,
      createdAt: originalCreatedAt,
      updatedAt: new Date().toISOString(),
      type: "multiple-choice",
      references,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      versionNumber: version,
      isLatest: 1,
      packageId: selectedAuthorProduct ? parseInt(selectedAuthorProduct.id) : (packageId ? parseInt(packageId) : null),
      productId: selectedAuthorProduct ? parseInt(selectedAuthorProduct.id) : (packageId ? parseInt(packageId) : null),
      gallery
    };

    try {
      setLoading(true);
      let resultId = questionId;
      if (isEditing) {
        await updateQuestion(q);
      } else {
        const created = await addQuestion(q);
        resultId = created.id;
      }

      if (shouldPublish) {
        alert("Published successfully!");
        router.push("/author/manage-questions");
      } else {
        setLastSaved(Date.now());
        alert("Draft saved!");
        if (!isEditing) router.push(`/author/create-question?id=${resultId}`);
      }
    } catch (err) {
      console.error("Save error details:", err);
      alert("Save failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [validate, errors, isEditing, status, version, questionId, conceptId, stem, stemImage, choices, correctIndex, explanationCorrect, explanationCorrectImage, explanationWrong, explanationWrongImage, summary, summaryImage, system, subject, topic, originalCreatedAt, references, tags, gallery, selectedAuthorProduct, packageId, router, matrixColumns, matrixPlacement, hideOptionText]);

  const resetForm = useCallback(() => {
    setQuestionId("");
    setConceptId("");
    setStatus("draft");
    setTopic("");
    setStem("");
    setStemImage({ data: "", size: "default", fileName: "", placement: "bottom" });
    setMatrixColumns([]);
    setMatrixPlacement("after");
    setHideOptionText(false);
    setChoices(Array(5).fill().map(() => ({
      text: "",
      image: { data: "", size: "default", fileName: "", placement: "bottom" },
      matrixValues: []
    })));
    setCorrectIndex(0);
    setExplanationCorrect("");
    setExplanationCorrectImage({ data: "", size: "default", fileName: "", placement: "bottom" });
    setExplanationWrong("");
    setExplanationWrongImage({ data: "", size: "default", fileName: "", placement: "bottom" });
    setSummary("");
    setSummaryImage({ data: "", size: "default", fileName: "", placement: "bottom" });
    setReferences("");
    setTags("");
    setGallery({});
    setVersion(1);
    setLastSaved(null);
  }, []);

  const addChoice = useCallback(() => {
    setChoices(prev => [
      ...prev,
      {
        text: "",
        image: { data: "", size: "default", fileName: "", placement: "bottom" },
        matrixValues: matrixColumns.map(() => "")
      }
    ]);
  }, [matrixColumns]);

  const addMatrixColumn = useCallback(() => {
    const colId = "col_" + Date.now();
    setMatrixColumns(prev => [...prev, { id: colId, label: "", vertical: false }]);
    setChoices(prev => prev.map(c => ({
      ...c,
      matrixValues: [...(c.matrixValues || []), ""]
    })));
  }, []);

  const removeMatrixColumn = useCallback((index) => {
    setMatrixColumns(prev => prev.filter((_, i) => i !== index));
    setChoices(prev => prev.map(c => ({
      ...c,
      matrixValues: (c.matrixValues || []).filter((_, i) => i !== index)
    })));
  }, []);

  const updateMatrixColumn = useCallback((index, updates) => {
    setMatrixColumns(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  }, []);

  const updateChoiceMatrixValue = useCallback((choiceIndex, colIndex, value) => {
    setChoices(prev => prev.map((c, i) => {
      if (i === choiceIndex) {
        const nextValues = [...(c.matrixValues || [])];
        nextValues[colIndex] = value;
        return { ...c, matrixValues: nextValues };
      }
      return c;
    }));
  }, []);

  const removeChoice = useCallback((index) => {
    setChoices(prev => {
      if (prev.length <= 2) {
        alert("Minimum 2 choices required.");
        return prev;
      }
      const next = prev.filter((_, i) => i !== index);
      // Adjust correctIndex if needed
      if (correctIndex === index) {
        setCorrectIndex(0);
      } else if (correctIndex > index) {
        setCorrectIndex(correctIndex - 1);
      }
      return next;
    });
  }, [correctIndex]);

  const generateAutoId = useCallback(() => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setQuestionId(random);
  }, []);

  const handleImageChange = useCallback((setter, current, imageType = 'image') => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Upload to Supabase Storage
      const currentQuestionId = questionId || `temp-${Date.now()}`;
      const publicUrl = await uploadImageToStorage(file, currentQuestionId, imageType);
      
      // Set the URL instead of base64
      setter({ ...current, data: publicUrl, fileName: file.name });
    } catch (error) {
      console.error('Image upload failed, falling back to base64:', error);
      // Fallback to base64 if upload fails
      fileToBase64(file, (img) => setter({ ...current, data: img, fileName: file.name }));
    }
  }, [questionId]);

  const handleTextareaChange = useCallback((setter, fieldName) => (e) => {
    const value = e.target.value;
    setter(value);
    const pos = e.target.selectionStart;
    const textBefore = value.slice(0, pos);
    const openBracket = textBefore.lastIndexOf('[');
    const closeBracket = textBefore.lastIndexOf(']');
    if (openBracket > closeBracket && pos - openBracket < 40) {
      let suggestedKey = "";
      if (fieldName === "stem") suggestedKey = "stem-image";
      else if (fieldName === "correct") suggestedKey = "correct-image";
      else if (fieldName === "wrong") suggestedKey = "wrong-image";
      else if (fieldName === "summary") suggestedKey = "summary-image";
      const inside = textBefore.slice(openBracket + 1);
      setSuggestion(`[${inside}|${suggestedKey}]`);
      setActiveField(fieldName);
    } else {
      setSuggestion(null);
      setActiveField(null);
    }
  }, []);

  const handleKeyDownSuggested = useCallback((e, setter, textareaRef) => {
    if ((e.key === "Tab" || e.key === "Enter") && suggestion && activeField) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const pos = textarea.selectionStart;
      const textBefore = textarea.value.slice(0, pos);
      const openIndex = textBefore.lastIndexOf('[');
      if (openIndex !== -1) {
        const newValue = textarea.value.slice(0, openIndex) + suggestion + textarea.value.slice(pos);
        setter(newValue);
        setTimeout(() => {
          textarea.focus();
          const newPos = openIndex + suggestion.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      }
      setSuggestion(null);
      setActiveField(null);
    }
  }, [suggestion, activeField]);

  const insertHighlightImage = useCallback((textSetter, textareaRef, currentText, imageSetter = null, currentImageObject = null) => () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = currentText.substring(start, end);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;

        // If no text is highlighted, add as a new auto-show image (no word/label)
        if (!selection && imageSetter) {
          const imgId = "img_" + Date.now();

          setGallery(prev => {
            const safePrev = (prev && typeof prev === 'object') ? prev : {};
            return { ...safePrev, [imgId]: { data: base64, size: 'default', placement: 'top', variant: 'standalone' } };
          });

          const newText = currentText.substring(0, start) + `[image:${imgId}]` + currentText.substring(end);
          textSetter(newText);
          return;
        }

        // If text is highlighted, insert as inline interactive element
        const word = selection || "word";

        // NEW BEHAVIOR: We add to the gallery and use [word|image:id]
        if (imageSetter) {
          const imgId = "img_" + Date.now();
          setGallery(prev => ({ ...prev, [imgId]: { data: base64, size: 'default', placement: 'bottom', variant: 'interactive' } }));

          const newText = currentText.substring(0, start) + `[${word}|image:${imgId}]` + currentText.substring(end);
          textSetter(newText);
        } else {
          // Fallback to legacy base64-in-text behavior if no section image setter is provided
          const newText = currentText.substring(0, start) + `[${word}|image:${base64}]` + currentText.substring(end);
          textSetter(newText);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [gallery]);

  const removeHighlight = useCallback((textSetter, currentText) => () => {
    // Matches [word|image:id] OR [word|image] OR [image:id] OR [image]
    const newText = currentText.replace(/\[(?:([^|\]]+)\|)?image(?::[^\]]+)?\]/g, (match, word) => word || "");
    if (newText !== currentText) {
      if (confirm("Remove all highlight images from this field?")) {
        textSetter(newText);
      }
    } else {
      alert("No highlight images found in this field.");
    }
  }, []);

  const removeGalleryItem = useCallback((id) => {
    if (!confirm("Are you sure you want to remove this image from everywhere? This will also remove its tags from all text fields.")) return;

    // 1. Remove from gallery
    setGallery(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    // 2. Remove from all text fields
    // Matches [word|image:id] or [image:id] or [word|gallery_id] or [gallery_id]
    // The previous implementation used image:id but some legacy might have just id or gallery_id
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagRegex = new RegExp(`\\[(?:([^|\\]]+)\\|)?image:${escapedId}\\]`, 'g');
    const standaloneTagRegex = new RegExp(`\\[image:${escapedId}\\]`, 'g');

    const cleanText = (text) => {
      if (!text) return text;
      return text.replace(tagRegex, (match, word) => word || "").replace(standaloneTagRegex, "");
    };

    setStem(prev => cleanText(prev));
    setChoices(prev => prev.map(c => ({ ...c, text: cleanText(c.text) })));
    setExplanationCorrect(prev => cleanText(prev));
    setExplanationWrong(prev => cleanText(prev));
    setSummary(prev => cleanText(prev));
    setReferences(prev => cleanText(prev));
  }, []);

  const updateGalleryItem = useCallback((id, updates) => {
    setGallery(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  }, []);

  return {
    isAuthorized, isEditing, loading, loadError, errors,
    questionId, setQuestionId, originalCreatedAt, version, lastSaved,
    status, conceptId,
    system, setSystem, subject, setSubject, topic, setTopic, packageId,
    stem, setStem, stemImage, setStemImage,
    choices, setChoices, correctIndex, setCorrectIndex,
    matrixColumns, setMatrixColumns,
    matrixPlacement, setMatrixPlacement,
    hideOptionText, setHideOptionText,
    explanationCorrect, setExplanationCorrect, explanationCorrectImage, setExplanationCorrectImage,
    explanationWrong, setExplanationWrong, explanationWrongImage, setExplanationWrongImage,
    summary, setSummary, summaryImage, setSummaryImage,
    references, setReferences, tags, setTags, gallery, setGallery,
    suggestion, activeField, availableSystems, availableSubjects,
    saveQuestion, resetForm, generateAutoId, handleImageChange, handleTextareaChange, handleKeyDownSuggested, insertHighlightImage, removeHighlight, removeGalleryItem, updateGalleryItem,
    addChoice, removeChoice, addMatrixColumn, removeMatrixColumn, updateMatrixColumn, updateChoiceMatrixValue,
    questionId // Add questionId for image uploads
  };
}
