import LegalDocumentLayout from "@/components/LegalDocumentLayout";
import { PARTNER_PRIVACY_SECTIONS } from "@/content/partner-legal-fr";

export const metadata = {
  title: "Confidentialité candidature partenaire — Paulo",
  description: "Politique de confidentialité relative à la candidature partenaire Paulo.",
};

export default function PartnerPrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Politique de confidentialité — candidature partenaire"
      subtitle="Informations sur le traitement de vos données lors de votre inscription au réseau Paulo."
      sections={PARTNER_PRIVACY_SECTIONS}
    />
  );
}
