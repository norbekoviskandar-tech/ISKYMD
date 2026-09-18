"use client";

import React, { Suspense } from "react";
import { useQuestionEditor } from "@/hooks/author/useQuestionEditor";
import MetadataPanel from "@/components/author/question/MetadataPanel";
import StemEditor from "@/components/author/question/StemEditor";
import OptionEditor from "@/components/author/question/OptionEditor";
import ExplanationEditor from "@/components/author/question/ExplanationEditor";
import GalleryEditor from "@/components/author/question/GalleryEditor";

function CreateQuestionPageInner() {
  const editor = useQuestionEditor();
  const { isAuthorized, loading, loadError } = editor;

  if (!isAuthorized) return null;
  if (loading) return <div className="p-10 text-center text-xl font-bold text-slate-400">Loading question...</div>;
  if (loadError) return <div className="p-10 text-center text-xl text-red-600 font-bold">{loadError}</div>;

  return (
    <div className="p-2 pb-20">
      <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
        {/* LEFT PANEL: METADATA & ACTIONS */}
        <MetadataPanel editor={editor} />

        {/* MAIN CONTENT: EDITORS */}
        <fieldset className="space-y-4">
          <StemEditor editor={editor} />
          <OptionEditor editor={editor} />
          <ExplanationEditor editor={editor} />
          <GalleryEditor editor={editor} />
        </fieldset>
      </form>
    </div>
  );
}

export default function CreateQuestionPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xl font-bold text-slate-400">Loading question...</div>}>
      <CreateQuestionPageInner />
    </Suspense>
  );
}
