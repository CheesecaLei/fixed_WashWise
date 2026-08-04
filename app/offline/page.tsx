"use client";

import React from "react";
import { Box, Button, Typography, Container, Paper, Chip } from "@mui/material";
import { WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOfflineQueue } from "../providers/offline-queue-provider";

export default function OfflinePage() {
  const router = useRouter();
  const { pendingCount } = useOfflineQueue();

  return (
    <Container
      maxWidth="sm"
      sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: "center",
          borderRadius: 4,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 10px 20px rgba(99, 102, 241, 0.3)",
          }}
        >
          <WifiOff size={40} style={{ color: "white" }} />
        </Box>

        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: "#1e293b" }}>
          You&apos;re Offline
        </Typography>

        <Typography variant="body1" sx={{ color: "#64748b", mb: pendingCount > 0 ? 2 : 4, lineHeight: 1.6 }}>
          It looks like you&apos;ve lost your connection. Don&apos;t worry — you can still queue
          a laundry order and it will be submitted automatically when you reconnect.
        </Typography>

        {/* Pending orders indicator */}
        {pendingCount > 0 && (
          <Box sx={{ mb: 3 }}>
            <Chip
              label={`${pendingCount} order${pendingCount === 1 ? "" : "s"} queued — will sync when online`}
              color="warning"
              icon={<WifiOff size={16} />}
              sx={{ fontWeight: 700, fontSize: 12, height: 32 }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: "stretch" }}>
          {/* Primary CTA — place an order while offline */}
          <Button
            variant="contained"
            onClick={() => router.push("/member/new-order")}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
              "&:hover": {
                background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)",
              },
            }}
          >
            📦 Place Order (Offline)
          </Button>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => window.location.reload()}
              sx={{
                py: 1.2,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#e2e8f0",
                color: "#64748b",
                "&:hover": { borderColor: "#cbd5e1", background: "#f8fafc" },
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push("/")}
              sx={{
                py: 1.2,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#e2e8f0",
                color: "#64748b",
                "&:hover": { borderColor: "#cbd5e1", background: "#f8fafc" },
              }}
            >
              Go Home
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
