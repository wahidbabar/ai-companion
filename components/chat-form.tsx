"use client";

import React, { FormEvent, KeyboardEvent } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatFormProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isBusy: boolean;
}

const ChatForm = ({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isBusy,
}: ChatFormProps) => {
  const canSend = input.trim().length > 0 && !isBusy;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-card/60 p-2 pl-4 shadow-sm transition-all focus-within:border-brand/50 focus-within:shadow-md focus-within:ring-1 focus-within:ring-brand/20">
        <TextareaAutosize
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          minRows={1}
          maxRows={6}
          className="flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground transition hover:bg-accent"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
              canSend
                ? "bg-brand text-white shadow-sm shadow-brand/30 hover:opacity-90 active:scale-95"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 hidden px-1 text-center text-xs text-muted-foreground sm:block">
        <kbd className="rounded border border-border bg-secondary px-1 font-mono text-[10px]">Enter</kbd>{" "}
        to send &middot;{" "}
        <kbd className="rounded border border-border bg-secondary px-1 font-mono text-[10px]">Shift + Enter</kbd>{" "}
        for a new line
      </p>
    </form>
  );
};

export default ChatForm;
