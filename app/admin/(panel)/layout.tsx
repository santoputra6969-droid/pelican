import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/admin/Toast";
import { requireAdmin } from "@/lib/session";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <ToastProvider>
      <div className="min-h-screen overflow-x-hidden bg-[var(--background)] lg:flex">
        <AdminSidebar adminName={admin.name} />
        <main className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
