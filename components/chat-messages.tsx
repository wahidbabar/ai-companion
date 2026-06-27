"use client";

import { Companion } from "@prisma/client";
import React, { useEffect, useRef, useState } from "react";
import ChatMessage, { ChatMessageProps } from "./chat-message";
import BotAvatar from "./bot-avatar";
import { Sparkles } from "lucide-react";

export type ChatStatus = "idle" | "thinking" | "streaming";

interface ChatMessagesProps {
  messages: ChatMessageProps[];
  companion: Companion;
  status: ChatStatus;
  onSendSuggestion: (text: string) => void;
  onRegenerate: () => void;
}

const STARTERS = [
  "Tell me a bit about yourself",
  "What can you help me with?",
  "Surprise me with something interesting",
  "What's on your mind today?",
];

const ChatMessages = ({
  messages,
  companion,
  status,
  onSendSuggestion,
  onRegenerate,
}: ChatMessagesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const onScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < 120);
  };

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status, autoScroll]);

  const isEmpty = messages.length === 0;

  if (isEmpty && status === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 text-center">
        {/* Avatar hero */}
        <div className="relative mb-6">
          {/* Ambient glow behind avatar */}
          <div className="absolute -inset-6 rounded-full bg-brand/10 blur-2xl" />
          <div className="absolute -inset-3 rounded-full bg-brand/5 blur-lg" />
          <BotAvatar
            src={companion.src}
            className="relative h-24 w-24 ring-4 ring-brand/20 shadow-2xl shadow-brand/10"
          />
          {/* Online status dot */}
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">{companion.name}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {companion.description}
        </p>

        <p className="mt-5 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
          Start a conversation
        </p>

        <div className="mt-3 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => onSendSuggestion(starter)}
              className="group flex items-start gap-2.5 rounded-xl border border-border bg-card/60 px-4 py-3.5 text-left text-sm text-foreground/80 shadow-sm transition-all duration-150 hover:border-brand/40 hover:bg-card hover:text-foreground hover:shadow-md hover:shadow-brand/5 active:scale-[0.98]"
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors duration-150 group-hover:text-brand" />
              <span>{starter}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-2">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isLastAssistant = isLast && message.role === "system";

          return (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              createdAt={message.createdAt}
              memories={message.memories}
              src={message.role === "system" ? companion.src : undefined}
              name={companion.name}
              isLoading={isLastAssistant && status === "thinking"}
              isStreaming={isLastAssistant && status === "streaming"}
              canRegenerate={isLastAssistant && status === "idle"}
              onRegenerate={onRegenerate}
            />
          );
        })}
      </div>
      <div ref={bottomRef} className="h-2" />
    </div>
  );
};

export default ChatMessages;
