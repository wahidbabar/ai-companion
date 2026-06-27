"use client";

import ChatHeader from "@/components/chat-header";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import ChatForm from "@/components/chat-form";
import ChatMessages, { ChatStatus } from "@/components/chat-messages";
import { ChatMessageProps } from "@/components/chat-message";
import { Companion, Message } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import { RetrievedMemory } from "@/components/memory-inspector";

/** Decode the base64 (UTF-8) X-Memories header into typed memory snippets. */
function decodeMemories(header: string | null): RetrievedMemory[] {
  if (!header) return [];
  try {
    const bytes = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return [];
  }
}

interface ChatClientProps {
  companion: Companion & {
    messages: Message[];
    _count: {
      messages: number;
    };
  };
}

const ChatClient = ({ companion }: ChatClientProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessageProps[]>(
    companion.messages
  );
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const streamReply = async (prompt: string, regenerate = false) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("thinking");

    try {
      const response = await fetch(`/api/chat/${companion.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, regenerate }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        toast({
          variant: "destructive",
          description: data?.error ?? "Something went wrong. Please try again.",
        });
        setMessages((current) => current.slice(0, -1));
        return;
      }

      const memories = decodeMemories(response.headers.get("x-memories"));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const replyTime = new Date();
      let accumulated = "";
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        if (firstToken) {
          setStatus("streaming");
          firstToken = false;
        }

        setMessages((current) => {
          const updated = [...current];
          updated[updated.length - 1] = {
            role: "system",
            content: accumulated,
            createdAt: replyTime,
            memories,
          };
          return updated;
        });
      }

      router.refresh();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error("Error streaming reply:", error);
      toast({
        variant: "destructive",
        description: "Network error. Please check your connection and try again.",
      });
      setMessages((current) => current.slice(0, -1));
    } finally {
      setStatus("idle");
      abortRef.current = null;
    }
  };

  const sendMessage = (text: string) => {
    const prompt = text.trim();
    if (!prompt || status !== "idle") return;

    const now = new Date();
    setMessages((current) => [
      ...current,
      { role: "user", content: prompt, createdAt: now },
      { role: "system", content: "", createdAt: now },
    ]);
    setInput("");
    streamReply(prompt);
  };

  const onRegenerate = () => {
    if (status !== "idle") return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser?.content) return;

    setMessages((current) => {
      const trimmed =
        current[current.length - 1]?.role === "system"
          ? current.slice(0, -1)
          : current;
      return [...trimmed, { role: "system", content: "", createdAt: new Date() }];
    });
    streamReply(lastUser.content, true);
  };

  const onStop = () => abortRef.current?.abort();

  return (
    <div className="relative flex h-full flex-col">
      {/* Ambient page glow — radiates from top center */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--brand)/0.07),transparent)]" />

      {/* Header */}
      <div className="relative shrink-0 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl">
          <ChatHeader companion={companion} status={status} />
        </div>
      </div>

      {/* Scrollable messages */}
      <ChatMessages
        companion={companion}
        messages={messages}
        status={status}
        onSendSuggestion={sendMessage}
        onRegenerate={onRegenerate}
      />

      {/* Input bar */}
      <div className="relative shrink-0 border-t border-border/60 bg-background/80 px-4 pb-4 pt-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl">
          <ChatForm
            input={input}
            onInputChange={setInput}
            onSubmit={() => sendMessage(input)}
            onStop={onStop}
            isBusy={status !== "idle"}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatClient;
