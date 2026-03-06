"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { addProcessNoteEntry } from "@/app/actions/notes";

interface NoteData {
  id: string;
  content: string;
  createdAt: Date;
  user: { name: string | null };
}

interface ProcessNoteCellProps {
  processId: string;
  notes: NoteData[];
}

export default function ProcessNoteCell({ processId, notes }: ProcessNoteCellProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim() || isPending) return;
    startTransition(async () => {
      const result = await addProcessNoteEntry(processId, content);
      if (result.success) setContent("");
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-orange-600 transition-colors"
      >
        <MessageSquare className="w-3 h-3" />
        <span className="font-semibold">{notes.length}</span>
        {open ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1.5">
          <div className="flex gap-1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Add process note..."
              className="flex-1 px-2 py-1 text-[11px] border rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
              disabled={isPending}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={isPending || !content.trim()}
              className="px-1.5 py-1 bg-orange-500 text-white rounded text-[10px] hover:bg-orange-600 disabled:opacity-40"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>

          {notes.length > 0 ? (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-700">{note.user.name ?? "User"}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-0.5">{note.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 text-center py-1">No notes yet</p>
          )}
        </div>
      )}
    </div>
  );
}
