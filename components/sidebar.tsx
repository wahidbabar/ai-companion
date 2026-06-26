"use client";

import React from "react";
import { Home, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useProModal } from "@/hooks/use-pro-modal";

interface SidebarProps {
  isPro: boolean;
}

const routes = [
  { icon: Home, href: "/", label: "Explore", pro: false },
  { icon: Plus, href: "/companion/new", label: "Create", pro: false },
  { icon: Settings, href: "/settings", label: "Settings", pro: false },
];

const Sidebar = ({ isPro }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const proModal = useProModal();

  const onNavigate = (url: string, pro: boolean) => {
    if (pro && !isPro) return proModal.onOpen();
    router.push(url);
  };

  return (
    <nav className="flex h-full flex-col border-r border-border/50 bg-background/95">
      <div className="flex-1 space-y-0.5 p-3 pt-4">
        {routes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <button
              key={route.href}
              onClick={() => onNavigate(route.href, route.pro)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <route.icon
                className={cn("h-4 w-4 shrink-0", isActive && "text-brand")}
              />
              {route.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Sidebar;
