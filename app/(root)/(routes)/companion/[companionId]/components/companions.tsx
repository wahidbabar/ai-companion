import { Companion } from "@prisma/client";
import { MessageSquare, SearchX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface CompanionProps {
  companions: (Companion & {
    _count: { messages: number };
  })[];
}

const Companions = ({ companions }: CompanionProps) => {
  if (companions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No companions found</p>
          <p className="text-sm text-muted-foreground">
            Try a different search or category.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-10 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {companions.map((companion) => (
        <Link
          key={companion.id}
          href={`/chat/${companion.id}`}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30"
        >
          <div className="relative aspect-[3/2] w-full overflow-hidden sm:aspect-[4/3]">
            <Image
              fill
              src={companion.src}
              alt={companion.name}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
          </div>
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {companion.name}
              </h3>
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {companion._count.messages}
              </div>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
              {companion.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground/60">
              @{companion.userName}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Companions;
