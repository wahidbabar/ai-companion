import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  className?: string;
}

const UserAvatar = ({ className }: UserAvatarProps) => {
  const { user } = useUser();

  return (
    <Avatar className={cn("h-12 w-12 ring-1 ring-border", className)}>
      <AvatarImage src={user?.imageUrl} className="object-cover" />
      <AvatarFallback className="bg-secondary text-xs font-medium">
        {user?.firstName?.[0] ?? "U"}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
