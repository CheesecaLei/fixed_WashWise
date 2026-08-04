"use client";

import Link from "next/link";
import { Divider, Stack, Typography } from "@mui/material";
import { useLayoutShell } from "../providers/layout-shell-provider";

export default function Footer() {
  const { brandName, footerLinks } = useLayoutShell();

  return (
    <>
      <Divider />
      <Stack
        component="footer"
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ px: { xs: 1.5, sm: 2, md: 3.5 }, py: { xs: 1, md: 1.2 }, bgcolor: "background.paper" }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} {brandName}. Premium Laundry Services.
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {footerLinks.map((link) => (
            <Typography
              key={link.id}
              component={Link}
              href={link.href}
              variant="caption"
              color="text.secondary"
              sx={{ textDecoration: "none", "&:hover": { color: "text.primary" } }}
            >
              {link.label}
            </Typography>
          ))}
        </Stack>
      </Stack>
    </>
  );
}
