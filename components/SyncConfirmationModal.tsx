"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOfflineQueue } from "../app/providers/offline-queue-provider";

export function SyncConfirmationModal() {
  const router = useRouter();
  const { syncState, lastSyncedOrderId, dismissSyncBanner } = useOfflineQueue();

  // We show the modal when syncState is 'complete' and we have an orderId.
  const isOpen = syncState === "complete" && !!lastSyncedOrderId;

  const handleCheckout = () => {
    if (lastSyncedOrderId) {
      router.push(`/member/new-order/checkout?orderId=${lastSyncedOrderId}`);
    }
    dismissSyncBanner();
  };

  const handleClose = () => {
    dismissSyncBanner();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="sync-dialog-title"
      aria-describedby="sync-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: 3,
          padding: 1,
          maxWidth: 400,
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3, mb: 1 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: "success.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.9,
          }}
        >
          <CheckCircle2 size={50} style={{ color: "white" }} />
        </Box>
      </Box>
      <DialogTitle id="sync-dialog-title" sx={{ textAlign: "center", fontWeight: 800, fontSize: "1.5rem", px: 4 }}>
        Order Ready!
      </DialogTitle>
      <DialogContent sx={{ px: 4 }}>
        <DialogContentText id="sync-dialog-description" sx={{ textAlign: "center", color: "text.primary", fontSize: "1rem", lineHeight: 1.5 }}>
          Great news! Your offline order was successfully synced. 
          Complete the checkout now to finalize your booking.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 4, px: 4, flexDirection: "column", gap: 1.5 }}>
        <Button
          onClick={handleCheckout}
          variant="contained"
          fullWidth
          size="large"
          sx={{
            py: 1.8,
            fontWeight: 800,
            textTransform: "none",
            borderRadius: 3,
            fontSize: "1rem",
            boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
            bgcolor: "success.main",
            "&:hover": { 
              bgcolor: "success.dark",
              boxShadow: "0 6px 20px rgba(0,118,255,0.23)",
            },
          }}
        >
          Complete Checkout →
        </Button>
        <Button
          onClick={handleClose}
          variant="text"
          fullWidth
          sx={{
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            "&:hover": { bgcolor: "transparent", color: "text.primary" },
          }}
        >
          I&apos;ll do it later
        </Button>
      </DialogActions>
    </Dialog>
  );
}
