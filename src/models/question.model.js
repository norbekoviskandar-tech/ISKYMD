// question.model.js
export default class Question {
  constructor(data) {
    this.id = data.id;
    this.stem = data.stem;
    this.stemImage = data.stemImage || data.image || { data: "", size: "default", fileName: "" };
    // Ensure choices is always an array
    if (typeof data.choices === 'string') {
      try {
        this.choices = JSON.parse(data.choices);
      } catch (e) {
        console.error("Failed to parse choices string:", e);
        this.choices = [];
      }
    } else {
      this.choices = Array.isArray(data.choices) ? data.choices : [];
    }
    this.correct = data.correct;
    this.subject = data.subject;
    this.system = data.system;
    this.topic = data.topic;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    this.explanationCorrect = data.explanationCorrect || data.correctExplanation || "";
    this.explanationCorrectImage = data.explanationCorrectImage || { data: "", size: "default", fileName: "" };
    
    this.explanationWrong = data.explanationWrong || data.wrongExplanation || "";
    this.explanationWrongImage = data.explanationWrongImage || { data: "", size: "default", fileName: "" };
    
    this.summary = data.summary || "";
    this.summaryImage = data.summaryImage || { data: "", size: "default", fileName: "" };
    
    this.published = data.published ?? false;

    this.references = data.references || ""; // scientific citations
    this.tags = data.tags || []; // array of strings

    // Governance Fields
    this.status = data.status || 'draft'; // draft, review, approved, published, archived, deprecated
    this.versionNumber = data.versionNumber || 1;
    this.isLatest = data.isLatest ?? 1;
    this.conceptId = data.conceptId || null;
    this.packageId = data.packageId || null;
    this.gallery = data.gallery || {};
    this.matrixColumns = data.matrixColumns || [];
    this.matrixPlacement = data.matrixPlacement || "after";
    this.hideOptionText = !!data.hideOptionText;

    // Version is a legacy field, versionNumber is the new standard
    this.version = data.version || this.versionNumber;
  }
}
