import { PublicFooter } from "@/components/shared/public-footer";

/** Public-route wrapper for /docs/*. Same shape as the /legal layout. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PublicFooter />
    </>
  );
}
