import React from "react";
import { Avatar, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

interface BotAvatarProps {
  src: string;
  className?: string;
}

const BotAvatar = ({ src, className }: BotAvatarProps) => {
  return (
    <Avatar className={cn("h-12 w-12 ring-1 ring-border", className)}>
      <AvatarImage src={src} className="object-cover" />
    </Avatar>
  );
};

export default BotAvatar;
