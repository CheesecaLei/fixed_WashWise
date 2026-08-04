"use client";

import Link from "next/link";
import { Box, Divider, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
        Privacy Policy
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Effective date: May 19, 2026
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Typography sx={{ mb: 1.2 }}>
        {"This Privacy Policy explains how Wash Wise (\"Wash Wise\", \"we\", \"us\" or \"our\") collects, uses, discloses, and protects personal data when you access or use our website, mobile applications, or related services (together, the \"Services\"). It also describes your rights and how to contact our Data Protection Officer (DPO) in the Philippines."}
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>1. Data Controller</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Wash Wise is the data controller responsible for your personal data in connection with the
        Services. For specific product instances, an affiliated entity may act as controller.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>2. Information We Collect</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We collect personal data that you provide directly (e.g., account details, contact
        information, payment information, government IDs where required for verification),
        information collected automatically (device, usage and location data), and information
        from third parties (e.g., social login providers or payment processors).
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>3. How We Use Personal Data</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We use personal data to: (a) provide and operate the Services; (b) process orders and
        payments; (c) communicate with you; (d) detect and prevent fraud; (e) improve and
        personalize the Services; and (f) comply with legal obligations. Location data is used to
        match you with nearby stores and to arrange pickup and delivery.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>4. Lawful Bases for Processing</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Where applicable law requires, we rely on one or more lawful bases to process personal
        data, including: performance of a contract, compliance with a legal obligation,
        legitimate interests (e.g., fraud prevention, service improvement), and your consent
        (e.g., marketing communications).
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>5. Sharing and Disclosure</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We share personal data with service providers and processors who perform services on our
        behalf (payment processors, logistics partners, cloud providers). We may disclose data to
        comply with legal obligations or to protect rights. We do not sell personal data.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>6. International Transfers</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Personal data may be transferred to, and processed in, countries other than your own.
        Where required by law, we put in place appropriate safeguards (standard contractual
        clauses or equivalent) to protect your personal data.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>7. Data Retention</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We retain personal data only as long as necessary to fulfill the purposes described in
        this Policy and to meet legal, regulatory, or accounting requirements. Retention periods
        vary by data category and purpose; for example, account data is retained for the life of
        the account plus a reasonable period thereafter for backup, fraud prevention and
        compliance.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>8. Your Rights</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Subject to local law, you may have rights to access, correct, port, restrict processing
        of, or delete your personal data, and to object to processing. To exercise these rights
        or to make a complaint, contact our DPO (details below). We will respond within the time
        required by applicable law.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>9. Security</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We implement commercially reasonable technical and organizational measures to protect
        personal data against unauthorized access, disclosure, loss or alteration. No system can
        be guaranteed completely secure; if you suspect a security incident, please contact us.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>10. Children&apos;s Privacy</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        Our Services are not directed at children under the age of 13. We do not knowingly
        collect personal data from children under 13. If you believe we have collected such
        information, please contact the DPO to request deletion.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>11. Data Protection Officer (DPO) — Philippines</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        For individuals in the Philippines, or where Philippine data protection law applies,
        contact our DPO for privacy inquiries, access requests, or to exercise your data
        protection rights:
      </Typography>
      <Typography sx={{ mb: 0.4 }}>
        <strong>Data Protection Officer</strong>
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Email: <a href="mailto:dpo@washwise.com.ph" style={{ color: "#11998e", textDecoration: "none", fontWeight: 700 }}>dpo@washwise.com.ph</a>
        <br />
        Phone: +63 47 222 8888 / +63 917 123 4567
        <br />
        Address: WashWise Laundry Headquarters, Magsaysay Drive, East Tapinac, Olongapo City, 2200, Philippines
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>12. Cookies & Tracking</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We and third-party service providers use cookies and similar technologies for security,
        analytics, performance and advertising. You can manage cookie preferences through your
        browser or account settings where provided.
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>13. Changes to this Policy</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        We may update this Privacy Policy to reflect changes in our practices or legal
        requirements. We will post the revised Policy with an updated effective date. Where
        required by law, we will seek consent or provide notice before material changes take
        effect.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography color="text.secondary" sx={{ mb: 1.2 }}>
        For further information or to make a request regarding your personal data, please contact
        our DPO at the details above or use the contact channels available in the application.
        You may also review our <Link href="/terms">Terms of Service</Link> for additional
        legal information.
      </Typography>
    </Box>
  );
}
