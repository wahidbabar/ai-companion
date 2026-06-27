"use client";

import { useProModal } from "@/hooks/use-pro-modal";
import { UserButton } from "@clerk/nextjs";
import { Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import MobileSidebar from "./mobile-sidebar";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

interface NavbarProps {
  isPro: boolean;
}

const Navbar = ({ isPro }: NavbarProps) => {
  const proModal = useProModal();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MobileSidebar isPro={isPro} />
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand shadow-sm shadow-brand/30">
              <Zap className="h-[15px] w-[15px] fill-current text-white" />
            </div>
            <span className="hidden text-[17px] font-semibold tracking-tight sm:block">
              companion<span className="text-brand">.ai</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {!isPro && (
            <Button
              variant="outline"
              size="sm"
              onClick={proModal.onOpen}
              className="hidden sm:flex h-8 gap-1.5 border-brand/30 text-brand hover:border-brand/50 hover:bg-brand/10 hover:text-brand"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade
            </Button>
          )}
          <ModeToggle />
          <UserButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
