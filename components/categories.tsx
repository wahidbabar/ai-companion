"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Category } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import queryString from "query-string";

interface CategoriesProps {
  data: Category[];
}

const Categories = ({ data }: CategoriesProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("categoryId");

  const onClick = (id: string | undefined) => {
    const query = { categoryId: id };

    const url = queryString.stringifyUrl(
      {
        url: window.location.href,
        query,
      },
      { skipNull: true }
    );

    router.push(url);
  };

  const pillClass = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition",
      active
        ? "border-brand/40 bg-brand/10 text-foreground"
        : "border-border bg-card/50 text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="flex w-full gap-2 overflow-x-auto p-1">
      <button onClick={() => onClick(undefined)} className={pillClass(!categoryId)}>
        Newest
      </button>
      {data.map((item) => (
        <button
          key={item.id}
          onClick={() => onClick(item.id)}
          className={pillClass(item.id === categoryId)}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
};

export default Categories;
