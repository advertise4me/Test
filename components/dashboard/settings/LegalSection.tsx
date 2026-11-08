import SettingsCard from "./SettingsCard";
import { SettingsRow } from "./SettingsRow";

// Non-functional placeholders - Phase 5b builds the actual legal pages and
// terms-acceptance clickwrap flow and wires these rows up to them.
export default function LegalSection() {
  return (
    <SettingsCard title="Legal">
      <SettingsRow label="Terms of Service" />
      <SettingsRow label="Privacy Policy" />
    </SettingsCard>
  );
}
