import { PublicFooter } from "@/components/shared/public-footer";

/**
 * Public-route wrapper for /legal/*. Adds the platform-wide footer
 * with links to every legal sub-page so anonymous visitors can
 * navigate sideways without going back to the index.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PublicFooter />
    </>
  );
}
