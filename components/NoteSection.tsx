"use client";

import { useState, useTransition } from "react";
import { Send, MessageSquare } from "lucide-react";
import { addItemNote, addProcessNoteEntry } from "@/app/actions/notes";

type NoteType = "item" | "process";

interface NoteData {
  id: string;
  content: string;
  createdAt: Date;
  user: { name: string | null };
}

interface NoteSectionProps {
  type: NoteType;
  targetId: string;
  notes: NoteData[];
  compact?: boolean;
}

export default function NoteSection({ type, targetId, notes, compact }: NoteSectionProps) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim() || isPending) return;
    startTransition(async () => {
      const action = type === "item" ? addItemNote : addProcessNoteEntry;
      const result = await action(targetId, content);
      if (result.success) setContent("");
    });
  };

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {/* Note input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={type === "item" ? "Add item note..." : "Add process note..."}
          className="flex-1 px-2 py-1 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
          disabled={isPending}
        />
        <button
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
          className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-40 flex items-center gap-1"
        >
          <Send className="w-3 h-3" />
        </button>
      </div>

      {/* Notes list */}
      {notes.length > 0 && (
        <div className={`space-y-1 ${compact ? "max-h-20" : "max-h-32"} overflow-y-auto`}>
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-1.5 text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1">
              <MessageSquare className="w-3 h-3 mt-0.5 text-orange-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-gray-700">{note.user.name ?? "User"}</span>
                <span className="mx-1 text-gray-400">·</span>
                <span className="text-gray-400">
                  {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <p className="text-gray-600 mt-0.5">{note.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
