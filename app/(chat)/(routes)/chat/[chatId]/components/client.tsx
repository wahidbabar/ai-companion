"use client";

import ChatHeader from "@/components/chat-header";
import { useRouter } from "next/navigation";
import React, { FormEvent, useState } from "react";
import ChatForm from "@/components/chat-form";
import ChatMessages from "@/components/chat-messages";
import { ChatMessageProps } from "@/components/chat-message";
import { Companion, Message } from "@prisma/client";

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
  const [messages, setMessages] = useState<ChatMessageProps[]>(
    companion.messages
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessageProps = {
      role: "user",
      content: input,
    };
    setMessages((current) => [...current, userMessage]);

    const placeholderMessage: ChatMessageProps = {
      role: "system",
      content: "",
    };
    setMessages((current) => [...current, placeholderMessage]);

    setIsLoading(true);
    setInput("");

    try {
      const response = await fetch(`/api/chat/${companion.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        const cleanedContent = accumulatedContent.replace(/\s*<\/s>\s*$/, "");

        setMessages((current) => {
          const updatedMessages = [...current];
          updatedMessages[updatedMessages.length - 1] = {
            role: "system",
            content: cleanedContent,
          };
          return updatedMessages;
        });
      }

      router.refresh();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((current) => current.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-2">
      <ChatHeader companion={companion} />
      <ChatMessages
        companion={companion}
        isLoading={isLoading}
        messages={messages}
      />
      <ChatForm
        isLoading={isLoading}
        input={input}
        handleInputChange={handleInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default ChatClient;
