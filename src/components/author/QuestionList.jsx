"use client";

import { useEffect, useState } from "react";
import { getAllQuestions } from "@/services/question.service";

export default function QuestionList() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const all = await getAllQuestions();
        setQuestions(Array.isArray(all) ? all : []);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setQuestions([]);
      }
    }
    fetchQuestions();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">All Questions</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-[#171717]">
            <th className="border p-2">ID</th>
            <th className="border p-2">Stem</th>
            <th className="border p-2">Subject</th>
            <th className="border p-2">System</th>
            <th className="border p-2">Topic</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.id}>
              <td className="border p-2 text-xs">{q.id.slice(0, 8)}...</td>
              <td className="border p-2 text-sm">{q.stem.slice(0, 50)}...</td>
              <td className="border p-2">{q.subject}</td>
              <td className="border p-2">{q.system}</td>
              <td className="border p-2">{q.topic}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
