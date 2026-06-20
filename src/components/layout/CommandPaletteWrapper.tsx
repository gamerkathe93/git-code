"use client";
import { usePathname } from "next/navigation";
import CommandPalette from "@/components/ui/CommandPalette";

interface Repo { name: string; owner: string; }

export default function CommandPaletteWrapper({
  username, repos,
}: { username?: string; repos?: Repo[] }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  // /[owner]/[repo]/... → parts[0]=owner, parts[1]=repo
  const currentOwner = parts.length >= 2 ? parts[0] : undefined;
  const currentRepo = parts.length >= 2 ? parts[1] : undefined;

  return (
    <CommandPalette
      username={username}
      currentOwner={currentOwner}
      currentRepo={currentRepo}
      repos={repos || []}
    />
  );
}
