"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { AuroraBackground } from "@/components/shell/aurora-background";
import { motion, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ShortcutsDialog } from "@/components/shell/shortcuts-dialog";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" as const } },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useKeyboardShortcuts();

  return (
    <LazyMotion features={domAnimation}>
      <SidebarProvider>
        <AuroraBackground />
        <CommandPalette />
        <AppSidebar />
        <SidebarInset className="relative z-10">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
        <BottomNav />
        <ShortcutsDialog />
      </SidebarProvider>
    </LazyMotion>
  );
}
