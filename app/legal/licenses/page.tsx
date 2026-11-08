import { getLegalDoc } from "@/lib/legal";
import LegalDocPage from "@/components/legal/LegalDocPage";

export default function LicensesPage() {
  return <LegalDocPage doc={getLegalDoc("licenses")} backHref="/settings" />;
}
