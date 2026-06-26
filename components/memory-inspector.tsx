"use client";

import React, { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RetrievedMemory {
  text: string;
}

/**
 * Surfaces the long-term memories the RAG layer retrieved from the vector
 * database for a given reply. Collapsed by default; expands to show the exact
 * snippets that shaped the response.
 */
export function MemoryInspector({ memories }: { memories: RetrievedMemory[] }) {
  const [open, setOpen] = useState(false);

  if (!memories || memories.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <Brain className="h-3.5 w-3.5 text-brand" />
        Referenced {memories.length}{" "}
        {memories.length === 1 ? "memory" : "memories"}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul className="mt-2 space-y-2 border-l-2 border-brand/30 pl-3">
          {memories.map((memory, i) => (
            <li
              key={i}
              className="text-xs leading-relaxed text-muted-foreground"
            >
              <span className="mr-1 text-muted-foreground/50">{i + 1}.</span>
              {memory.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
