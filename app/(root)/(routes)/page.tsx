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
    <div className="h-full p-4 space-y-2">
      <SearchInput />
      <Categories data={categories} />
      <Companions companions={companions} />
    </div>
  );
};

export default RootPage;
