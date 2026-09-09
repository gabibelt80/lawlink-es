"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FolderOpen, Lock } from "lucide-react";

interface Props {
  active: "pending" | "approved" | "explorer";
  pendingCount: number;
}

export function ArchiveTabs({ active, pendingCount }: Props) {
  return (
    <div className="border-b border-border/60 flex items-end gap-1 text-sm overflow-x-auto">
      <Tab href="/archive?tab=pending" active={active === "pending"} icon={<Lock className="h-3.5 w-3.5" />}>
        Pendientes
        {pendingCount > 0 && (
          <span
            className={cn(
              "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]",
              active === "pending"
                ? "bg-[#9B7BF7] text-white"
                : "bg-amber-500/20 text-amber-700",
            )}
          >
            {pendingCount}
          </span>
        )}
      </Tab>
      <Tab href="/archive" active={active === "approved"} icon={<Lock className="h-3.5 w-3.5" />}>
        Archivados
      </Tab>
      <Tab href="/archive?tab=explorer" active={active === "explorer"} icon={<FolderOpen className="h-3.5 w-3.5" />}>
        Explorador de carpetas
      </Tab>
    </div>
  );
}

function Tab({
  href,
  active,
  children,
  icon,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 transition-colors whitespace-nowrap",
        active
          ? "border-[#9B7BF7] text-foreground font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
