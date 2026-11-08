import { getLegalDoc } from "@/lib/legal";
import LegalDocPage from "@/components/legal/LegalDocPage";

export default function TermsOfServicePage() {
  return <LegalDocPage doc={getLegalDoc("terms")} backHref="/settings" />;
}
