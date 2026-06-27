"use client";

import React from "react";
import { Button } from "./ui/button";
import { ChevronLeft, Edit, MessagesSquare, MoreVertical, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import BotAvatar from "./bot-avatar";
import { useUser } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useToast } from "./ui/use-toast";
import axios from "axios";
import { Companion, Message } from "@prisma/client";
import { cn } from "@/lib/utils";
import { type ChatStatus } from "./chat-messages";

interface ChatHeaderProps {
  companion: Companion & {
    messages: Message[];
    _count: { messages: number };
  };
  status?: ChatStatus;
}

const ChatHeader = ({ companion, status = "idle" }: ChatHeaderProps) => {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  const onDelete = async () => {
    try {
      await axios.delete(`/api/companion/${companion.id}`);
      toast({ description: "Companion deleted." });
      router.refresh();
      router.push("/");
    } catch {
      toast({ variant: "destructive", description: "Something went wrong." });
    }
  };

  const statusLabel =
    status === "thinking" ? "Thinking…"
    : status === "streaming" ? "Responding…"
    : "Ready to chat";

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          onClick={() => router.push("/")}
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Avatar with online ring */}
        <div className="relative shrink-0">
          <BotAvatar src={companion.src} className="h-10 w-10 ring-2 ring-border/80 shadow-sm" />
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm transition-colors duration-500",
              status !== "idle" ? "bg-amber-400" : "bg-emerald-500"
            )}
          />
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold tracking-tight">{companion.name}</p>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <MessagesSquare className="h-3 w-3" />
              {companion._count.messages}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{statusLabel}</p>
        </div>
      </div>

      {user?.id === companion.userId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/companion/${companion.id}`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ChatHeader;
