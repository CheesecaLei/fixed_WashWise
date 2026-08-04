"use client";

/**
 * OfflineSyncBanner.tsx
 *
 * Fixed bottom banner that surfaces sync progress to the member.
 * Driven entirely by syncState from OfflineQueueProvider.
 *
 * States:
 *   idle       → renders null
 *   syncing    → blue bar with spinner
 *   complete   → green bar with "Go to Checkout" button
 *   partial    → amber bar — some orders still pending retry
 *   attention  → red bar — one or more orders need manual re-submission
 */

import { Box, Button, CircularProgress, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import {
  X,
  WifiOff,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useOfflineQueue } from "../app/providers/offline-queue-provider";

const BANNER_CONFIG = {
  syncing: {
    bgcolor: "#1d4ed8",
    Icon: RotateCw,
    message: "Submitting your queued orders...",
    showProgress: true,
  },
  complete: {
    bgcolor: "#15803d",
    Icon: CheckCircle2,
    message: "Order submitted! Complete your checkout.",
    showProgress: false,
  },
  partial: {
    bgcolor: "#b45309",
    Icon: AlertTriangle,
    message: "Some orders are pending retry — we'll keep trying.",
    showProgress: false,
  },
  attention: {
    bgcolor: "#b91c1c",
    Icon: AlertCircle,
    message: "One or more orders need your attention.",
    showProgress: false,
  },
} as const;

export function OfflineSyncBanner() {
  const { syncState, lastSyncedOrderId, exhaustedOrderIds, resubmitOrder, dismissSyncBanner } = useOfflineQueue();
  const router = useRouter();

  if (syncState === "idle") return null;

  const config = BANNER_CONFIG[syncState];
  const { bgcolor, Icon, message, showProgress } = config;

  const handleCheckout = () => {
    if (lastSyncedOrderId) {
      router.push(`/member/new-order/checkout?orderId=${lastSyncedOrderId}`);
    }
    dismissSyncBanner();
  };

  const handleResubmitAll = () => {
    exhaustedOrderIds.forEach((id) => resubmitOrder(id));
    dismissSyncBanner();
  };

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        bgcolor,
        color: "#fff",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.2)",
      }}
    >
      {showProgress && <LinearProgress color="inherit" sx={{ opacity: 0.4, height: 2 }} />}

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.2}
        sx={{ px: { xs: 1.5, sm: 3 }, py: 1 }}
      >
        {/* Icon */}
        {syncState === "syncing" ? (
          <CircularProgress size={16} color="inherit" sx={{ flexShrink: 0 }} />
        ) : (
          <Icon size={18} style={{ flexShrink: 0 }} />
        )}

        {/* Message */}
        <Typography
          sx={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.3 }}
        >
          {message}
        </Typography>

        {/* Action buttons */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {syncState === "complete" && lastSyncedOrderId && (
            <Button
              size="small"
              variant="contained"
              onClick={handleCheckout}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
                px: 1.2,
                py: 0.4,
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                textTransform: "none",
              }}
            >
              Go to Checkout
            </Button>
          )}

          {syncState === "attention" && exhaustedOrderIds.length > 0 && (
            <Button
              size="small"
              variant="contained"
              startIcon={<WifiOff size={14} />}
              onClick={handleResubmitAll}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
                px: 1.2,
                py: 0.4,
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                textTransform: "none",
              }}
            >
              Re-submit
            </Button>
          )}

          {syncState !== "syncing" && (
            <IconButton
              size="small"
              onClick={dismissSyncBanner}
              sx={{ color: "rgba(255,255,255,0.8)", p: 0.4 }}
              aria-label="Dismiss"
            >
              <X size={16} />
            </IconButton>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
