import prismadb from "@/lib/prismadb";
import React from "react";
import { CompanionForm } from "./components/companion-form";
import { auth, currentUser } from "@clerk/nextjs/server";
import { RedirectToSignIn } from "@clerk/nextjs";

type Params = Promise<{
  companionId: string;
}>;
interface CompanionIdPageProps {
  params: Params;
}

const CompanionIdPage = async ({ params }: CompanionIdPageProps) => {
  const { companionId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return <RedirectToSignIn />;
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: companionId,
      userId,
    },
  });

  const categories = await prismadb.category.findMany();

  return <CompanionForm initialData={companion} categories={categories} />;
};

export default CompanionIdPage;
