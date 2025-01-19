import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import ChatClient from "./components/client";
import { RedirectToSignIn } from "@clerk/nextjs";

type Params = Promise<{ chatId: string }>;
interface ChatIdPageProps {
  params: Params;
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  const { chatId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return <RedirectToSignIn />;
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: chatId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        where: {
          userId,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  if (!companion) {
    return redirect("/");
  }

  return <ChatClient companion={companion} />;
};

export default ChatIdPage;
