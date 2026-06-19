import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { _count: { select: { notifications: { where: { isRead: false } } } } },
  });
  if (!user) redirect("/login");

  const unreadCount = user._count.notifications;

  const repos = await db.repository.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { name: true, isPrivate: true },
  });

  const navUser = {
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    unreadCount,
  };

  const sidebarUser = {
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    unreadCount,
    repos,
  };

  return (
    <>
      <Navbar user={navUser} />
      <Sidebar user={sidebarUser} />
      <main
        style={{
          marginTop: "var(--header-height)",
          marginLeft: "var(--sidebar-width)",
          minHeight: "calc(100vh - var(--header-height))",
          padding: "28px 28px 48px",
        }}
      >
        {children}
      </main>
    </>
  );
}
