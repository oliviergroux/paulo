import LegalDocumentLayout from "@/components/LegalDocumentLayout";
import { PARTNER_CGU_SECTIONS } from "@/content/partner-legal-fr";

export const metadata = {
  title: "CGU partenaires — Paulo",
  description: "Conditions générales d’admission au réseau partenaires Paulo.",
};

export default function PartnerCguPage() {
  return (
    <LegalDocumentLayout
      title="Conditions générales — réseau partenaires"
      subtitle="Document applicable lors de votre candidature au réseau Paulo."
      sections={PARTNER_CGU_SECTIONS}
    />
  );
}
