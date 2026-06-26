import Categories from "@/components/categories";
import SearchInput from "@/components/search-input";
import prismadb from "@/lib/prismadb";
import Companions from "./companion/[companionId]/components/companions";

type SearchParams = Promise<{
  categoryId: string;
  name: string;
}>;

interface RootPageProps {
  searchParams: SearchParams;
}

const RootPage = async ({ searchParams }: RootPageProps) => {
  const { categoryId, name } = await searchParams;

  const companions = await prismadb.companion.findMany({
    where: {
      categoryId,
      name: {
        search: name,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  const categories = await prismadb.category.findMany();

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 md:px-8 md:py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Explore companions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with AI characters that remember your conversations.
        </p>
      </div>
      <SearchInput />
      <Categories data={categories} />
      <Companions companions={companions} />
    </div>
  );
};

export default RootPage;
