import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { AuroraBackground } from "@/components/shell/aurora-background";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AuroraBackground />
      <CommandPalette />
      <AppSidebar />
      <SidebarInset className="relative z-10">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
