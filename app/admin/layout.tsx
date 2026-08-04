import { LayoutShellProvider } from "../providers/layout-shell-provider";
import AdminPushSubscriber from "../../components/AdminPushSubscriber";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutShellProvider userRole="admin">
      <AdminPushSubscriber />
      {children}
    </LayoutShellProvider>
  );
}
