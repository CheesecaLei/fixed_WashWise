"use client";

import Link from "next/link";
import { Box, Divider, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 3, md: 6 } }}>
      <Button
        variant="text"
        startIcon={<ArrowLeft size={20} />}
        onClick={() => router.back()}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Terms of Service
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Effective date: May 19, 2026
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Typography sx={{ mb: 1.2 }}>
        {"These Terms of Service (\"Terms\") govern your access to and use of the Wash Wise platform and services (the \"Service\"). By creating an account, placing an order, or otherwise using the Service, you accept and agree to be bound by these Terms."}
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>1. Eligibility</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        You must be at least 18 years old (or the age of majority in your jurisdiction) and able
        to form legally binding contracts to use the Service. If you are using the Service on
        behalf of a company or other legal entity, you represent that you have authority to bind
        that entity to these Terms.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>2. Account Registration</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        You agree to provide accurate and complete information when registering. You are
        responsible for maintaining the confidentiality of your credentials and for all activities
        on your account. Notify us immediately of any unauthorized use.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>3. Orders, Payments & Fees</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Orders are subject to acceptance. Prices, fees and taxes are displayed at checkout. By
        placing an order you authorize us to charge the designated payment method. Refunds and
        cancellations are handled according to our refunds policy and any specific product
        terms; see the Help Center or contact support for details.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>4. User Conduct & Prohibited Uses</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        You agree not to use the Service for unlawful purposes or to engage in behavior that
        interferes with the Service, including but not limited to fraud, harassment, reverse
        engineering, spamming, or uploading malicious content.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>5. Intellectual Property</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        All content and materials provided by Wash Wise (including trademarks, logos, text,
        graphics and software) are owned by Wash Wise or its licensors. You are granted a limited
        license to access and use the Service for personal, non-commercial purposes only.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>6. Limitations of Liability</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        To the fullest extent permitted by applicable law, Wash Wise and its affiliates will not
        be liable for indirect, incidental, special, consequential or punitive damages arising
        from your access to or use of the Service. Our total aggregate liability will not exceed
        amounts paid by you in the 12 months preceding the claim, unless otherwise required by
        law.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>7. Indemnification</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        You agree to indemnify and hold Wash Wise harmless from any claims, losses, liabilities,
        damages and expenses (including reasonable attorneys&apos; fees) arising from your breach of
        these Terms or your violation of law.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>8. Termination</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We may suspend or terminate your access to the Service at our discretion, including for
        breach of these Terms or fraudulent activity. Upon termination, your rights to use the
        Service cease, but certain provisions (e.g., limitation of liability, indemnity) will
        survive.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>9. Rewards and Promotions</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Wash Wise may offer rewards, loyalty points, or promotional discounts from time to time.
        These rewards are non-transferable, cannot be exchanged for cash, and may be subject to
        expiration dates or specific conditions. Wash Wise reserves the right to modify or cancel
        any rewards program or promotion at any time without prior notice.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>10. No-Show & Cancellation Policy</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        If you fail to show up for a scheduled pickup or delivery without prior notice (a "no-show"),
        your order may be cancelled. Repeated no-shows may result in a cancellation fee applied to
        your next order or temporary suspension of your account. Please cancel or reschedule at
        least 2 hours in advance.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>11. Governing Law & Dispute Resolution</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        These Terms are governed by the laws of the Republic of the Philippines to the extent
        permitted by applicable law. Disputes will be resolved in courts of competent
        jurisdiction, unless the parties agree to alternative dispute resolution.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>12. Changes to the Terms</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We may update these Terms from time to time. We will provide notice of material changes
        as required by law (for example via email or in-app notifications) and post the updated
        Terms with a new effective date.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        If you have questions about these Terms or need assistance, contact our support team or
        review our <Link href="/privacy">Privacy Policy</Link> for information about how we
        handle personal data.
      </Typography>
    </Box>
  );
}
