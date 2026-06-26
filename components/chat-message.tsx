"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";
import BotAvatar from "./bot-avatar";
import UserAvatar from "./user-avatar";
import { Markdown } from "./markdown";
import { MemoryInspector, RetrievedMemory } from "./memory-inspector";
import { Copy, RefreshCw } from "lucide-react";

export interface ChatMessageProps {
  role: "system" | "user";
  content?: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  src?: string;
  name?: string;
  createdAt?: Date | string;
  memories?: RetrievedMemory[];
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

function formatTime(value?: Date | string) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const ChatMessage = ({
  role,
  content,
  isLoading,
  isStreaming,
  src,
  name,
  createdAt,
  memories,
  onRegenerate,
  canRegenerate,
}: ChatMessageProps) => {
  const { toast } = useToast();
  const isUser = role === "user";

  // Timestamps are locale-formatted, which differs between the server and
  // browser. Only render after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast({ description: "Copied to clipboard." });
  };

  const time = formatTime(createdAt);

  if (isUser) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-1 flex w-full justify-end gap-3 px-1 py-2 duration-200">
        <div className="flex max-w-[80%] flex-col items-end gap-1 sm:max-w-[72%]">
          {mounted && time && (
            <span className="text-xs text-muted-foreground">{time}</span>
          )}
          <div className="rounded-2xl rounded-tr-sm bg-brand/15 px-4 py-2.5">
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
              {content}
            </p>
          </div>
        </div>
        <UserAvatar className="mt-5 h-8 w-8 shrink-0 self-start" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 group flex w-full gap-3 px-1 py-2 duration-200">
      {src ? (
        <BotAvatar src={src} className="mt-0.5 h-8 w-8 shrink-0 self-start" />
      ) : (
        <div className="mt-0.5 h-8 w-8 shrink-0" />
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            {name ?? "Companion"}
          </span>
          {mounted && time && (
            <span className="text-xs text-muted-foreground">{time}</span>
          )}
        </div>

        <div className="min-w-0">
          {isLoading ? (
            <ThinkingDots />
          ) : isStreaming ? (
            <p className="streaming-cursor whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
              {content}
            </p>
          ) : (
            <Markdown content={content ?? ""} />
          )}
        </div>

        {!isLoading && !isStreaming && memories && (
          <MemoryInspector memories={memories} />
        )}

        {!isLoading && content && (
          <div className="flex items-center gap-1 pt-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy message"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            {canRegenerate && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                aria-label="Regenerate response"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
