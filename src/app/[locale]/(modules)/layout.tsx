
import { Sidebar } from "@/components/layout/sidebar";
import { getSession } from "@/lib/auth";

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session?.user;

  return (
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row">
      <Sidebar className="hidden lg:block lg:w-64" user={user as { name?: string | null; role?: string } | undefined} />
      <main className="flex-1 w-full lg:pl-64 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
