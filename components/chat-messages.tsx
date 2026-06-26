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
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <BotAvatar src={companion.src} className="h-20 w-20 ring-4 ring-border" />
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {companion.name}
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {companion.description}
        </p>

        <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => onSendSuggestion(starter)}
              className="group flex items-start gap-2.5 rounded-xl border border-border bg-card/50 px-4 py-3 text-left text-sm text-foreground/80 transition-all hover:border-brand/40 hover:bg-card hover:text-foreground hover:shadow-sm"
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-brand" />
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
