import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import NotificationsClient from "@/components/notifications/NotificationsClient";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <NotificationsClient notifications={notifications as any[]} />;
}
