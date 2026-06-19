import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CreateRepoForm from "@/components/repo/CreateRepoForm";

export const metadata: Metadata = { title: "New repository" };

export default async function NewRepoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <CreateRepoForm username={session.username} />;
}
