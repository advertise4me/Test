import { getLegalDoc } from "@/lib/legal";
import LegalDocPage from "@/components/legal/LegalDocPage";

export default function PrivacyPolicyPage() {
  return <LegalDocPage doc={getLegalDoc("privacy")} backHref="/settings" />;
}
