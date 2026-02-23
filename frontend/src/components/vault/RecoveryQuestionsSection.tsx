import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import type { RecoveryQuestion } from "../../types";

interface Props {
  questions: RecoveryQuestion[];
  editing?: boolean;
  onChange?: (questions: RecoveryQuestion[]) => void;
}

const MAX_QUESTIONS = 10;

export default function RecoveryQuestionsSection({
  questions,
  editing,
  onChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(
    new Set()
  );

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleQuestionChange = (idx: number, value: string) => {
    const updated = questions.map((q, i) =>
      i === idx ? { ...q, question: value } : q
    );
    onChange?.(updated);
  };

  const handleAnswerChange = (idx: number, value: string) => {
    const updated = questions.map((q, i) =>
      i === idx ? { ...q, answer: value } : q
    );
    onChange?.(updated);
  };

  const handleAdd = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    onChange?.([...questions, { question: "", answer: "" }]);
  };

  const handleRemove = (idx: number) => {
    onChange?.(questions.filter((_, i) => i !== idx));
  };

  /* ── Edit mode ── */
  if (editing) {
    return (
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">
          Recovery Questions
        </label>
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1 space-y-1.5">
                <input
                  value={q.question}
                  onChange={(e) => handleQuestionChange(idx, e.target.value)}
                  placeholder="Question"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150"
                />
                <input
                  value={q.answer}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  placeholder="Answer"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="mt-2.5 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150"
                aria-label="Remove question"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={questions.length >= MAX_QUESTIONS}
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          Add question
        </button>
      </div>
    );
  }

  /* ── View mode ── */
  if (questions.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
      >
        Recovery Questions ({questions.length})
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {questions.map((q, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2"
            >
              <p className="text-xs text-zinc-300">{q.question}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {revealedAnswers.has(idx) ? (
                  <span className="text-xs text-zinc-400 font-mono">
                    {q.answer}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600 tracking-[0.18em]">
                    ••••••
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleAnswer(idx)}
                  className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
                  aria-label={
                    revealedAnswers.has(idx) ? "Hide answer" : "Show answer"
                  }
                >
                  {revealedAnswers.has(idx) ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
