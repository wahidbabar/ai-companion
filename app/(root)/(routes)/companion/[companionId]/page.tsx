import prismadb from "@/lib/prismadb";
import React from "react";
import { CompanionForm } from "./components/companion-form";
import { auth, currentUser } from "@clerk/nextjs/server";
import { RedirectToSignIn } from "@clerk/nextjs";

interface CompanionIdPageProps {
  params: {
    companionId: string;
  };
}

const CompanionIdPage = async ({ params }: CompanionIdPageProps) => {
  const { userId } = await auth();
  const user = await currentUser();
  // TODO: Check subscription

  console.log({ user, userId });

  if (!userId) {
    return <RedirectToSignIn />;
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: params.companionId,
      userId,
    },
  });

  const categories = await prismadb.category.findMany();

  return <CompanionForm initialData={companion} categories={categories} />;
};

export default CompanionIdPage;
