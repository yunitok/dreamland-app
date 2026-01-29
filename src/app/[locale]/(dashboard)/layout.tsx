import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row">
      <Sidebar className="hidden lg:block lg:w-64" />
      <main className="flex-1 w-full lg:pl-64 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
