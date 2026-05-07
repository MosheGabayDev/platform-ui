import { PublicFooter } from "@/components/shared/public-footer";

/**
 * Public-route wrapper for the (auth) group (login + signup +
 * reset-password). Anonymous prospects landing here from a marketing
 * link should be able to find legal docs without a roundtrip.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PublicFooter />
    </>
  );
}
