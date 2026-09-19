"use client";

import { useState } from "react";
import { addQuestion } from "@/services/question.service";
import Question from "@/models/question.model";

// UUID generator
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function QuestionForm() {
  const [stem, setStem] = useState("");
  const [choices, setChoices] = useState({ A: "", B: "", C: "", D: "", E: "" });
  const [correct, setCorrect] = useState("A");
  const [correctExplanation, setCorrectExplanation] = useState("");
  const [wrongExplanation, setWrongExplanation] = useState("");
  const [summary, setSummary] = useState("");
  const [subject, setSubject] = useState("");
  const [system, setSystem] = useState("");
  const [topic, setTopic] = useState("");

  async function handleSubmit() {
    if (!stem || Object.values(choices).some(c => !c) || !correct) {
      alert("Please fill all required fields");
      return;
    }

    const question = new Question({
      id: generateUUID(),
      stem,
      choices: Object.entries(choices).map(([k, v]) => ({ id: k, text: v })),
      correct,
      correctExplanation,
      wrongExplanation,
      summary,
      subject,
      system,
      topic,
      createdAt: Date.now()
    });

    await addQuestion(question);
    alert("Question added!");
    setStem(""); setChoices({ A: "", B: "", C: "", D: "", E: "" }); setCorrect("A");
    setCorrectExplanation(""); setWrongExplanation(""); setSummary("");
    setSubject(""); setSystem(""); setTopic("");
  }

  return (
    <div className="max-w-xl mx-auto p-4 bg-[#141414] border rounded">
      <h2 className="text-xl font-bold mb-4">Create Question</h2>

      <textarea placeholder="Question stem" className="w-full border p-2 mb-2" value={stem} onChange={e => setStem(e.target.value)} />

      {["A","B","C","D","E"].map(letter => (
        <input
          key={letter}
          placeholder={`Choice ${letter}`}
          className="w-full border p-2 mb-2"
          value={choices[letter]}
          onChange={e=>setChoices({...choices,[letter]:e.target.value})}
        />
      ))}

      <select className="w-full border p-2 mb-2" value={correct} onChange={e=>setCorrect(e.target.value)}>
        {["A","B","C","D","E"].map(c=><option key={c}>{c}</option>)}
      </select>

      <textarea placeholder="Why this answer is correct" className="w-full border p-2 mb-2" value={correctExplanation} onChange={e=>setCorrectExplanation(e.target.value)} />
      <textarea placeholder="Why other answers are wrong" className="w-full border p-2 mb-2" value={wrongExplanation} onChange={e=>setWrongExplanation(e.target.value)} />
      <textarea placeholder="Summary / Key points" className="w-full border p-2 mb-2" value={summary} onChange={e=>setSummary(e.target.value)} />

      <input placeholder="Subject" className="w-full border p-2 mb-2" value={subject} onChange={e=>setSubject(e.target.value)} />
      <input placeholder="System" className="w-full border p-2 mb-2" value={system} onChange={e=>setSystem(e.target.value)} />
      <input placeholder="Topic" className="w-full border p-2 mb-2" value={topic} onChange={e=>setTopic(e.target.value)} />

      <button className="w-full bg-black text-white py-2 rounded" onClick={handleSubmit}>Add Question</button>
    </div>
  );
}
