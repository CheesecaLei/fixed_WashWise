"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useOfflineStatus } from "../hooks/use-offline-status";

/**
 * Member layout — wraps all /member/* pages.
 *
 * Offline redirect guard:
 *   - When offline and NOT on /member/new-order, returns null immediately
 *     (blank screen) while router.replace fires. This prevents the offline
 *     UI (disabled nav, changed button) from flashing on non-new-order pages
 *     before the redirect completes.
 *   - Once the user lands on /member/new-order, children are rendered normally
 *     and the offline UI applies there.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const isOffline = useOfflineStatus();
  const pathname = usePathname();
  const router = useRouter();

  const isNewOrderRoute = pathname?.startsWith("/member/new-order");

  useEffect(() => {
    if (!isOffline || isNewOrderRoute) return;
    router.replace("/member/new-order");
  }, [isOffline, isNewOrderRoute, router]);

  // While offline and redirecting away from a non-new-order page,
  // render nothing so children never paint with the offline UI applied.
  if (isOffline && !isNewOrderRoute) {
    return null;
  }

  return <>{children}</>;
}
