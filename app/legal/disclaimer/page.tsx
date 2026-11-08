import { getLegalDoc } from "@/lib/legal";
import LegalDocPage from "@/components/legal/LegalDocPage";

export default function AdSpendDisclaimerPage() {
  return <LegalDocPage doc={getLegalDoc("disclaimer")} backHref="/settings" />;
}
