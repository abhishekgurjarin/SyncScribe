"use client";

import { useEffect, useState } from "react";

export type NetworkStatus = "online" | "offline";

/**
 * Hook to track browser online/offline status
 * with additional WebSocket connection state awareness
 */
export function useConnectionStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const handleOnline = () => setNetworkStatus("online");
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { networkStatus, isOnline: networkStatus === "online" };
}
