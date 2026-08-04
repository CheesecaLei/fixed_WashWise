"use client";

/**
 * offline-queue-badge.tsx
 *
 * A fixed floating pill that surfaces the number of orders pending background
 * sync. Renders null when the queue is empty.
 *
 * Place this inside a layout that is wrapped by <OfflineQueueProvider>.
 */

import { Chip, Tooltip } from "@mui/material";
import { WifiOff } from "lucide-react";
import { useOfflineQueue } from "../app/providers/offline-queue-provider";

export function OfflineQueueBadge() {
  const { pendingCount } = useOfflineQueue();

  if (pendingCount === 0) return null;

  return (
    <Tooltip
      title={`${pendingCount} order${pendingCount === 1 ? "" : "s"} will be submitted automatically when you reconnect.`}
      placement="top"
      arrow
    >
      <Chip
        icon={<WifiOff size={14} />}
        label={`${pendingCount} queued`}
        size="small"
        color="warning"
        sx={{
          position: "fixed",
          bottom: 80,
          right: 16,
          zIndex: 1400,
          fontWeight: 700,
          fontSize: 11,
          height: 28,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          cursor: "default",
          "& .MuiChip-icon": { ml: "6px" },
        }}
      />
    </Tooltip>
  );
}
