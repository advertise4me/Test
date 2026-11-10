// Shared shape between app/api/settings/route.ts (GET) and the Settings
// tab's client components - keeps the two from drifting independently.

export interface SettingsResponse {
  // True only for the one agency-owner account - see lib/admin.ts. Drives
  // whether the Settings tab shows the "Admin" row linking to /admin.
  isAdmin: boolean;
  profile: {
    email: string;
    fullName: string | null;
    businessName: string | null;
    businessWebsite: string | null;
    language: string;
  };
  businessTypeOptions: Array<{ value: string; label: string }>;
  dashboardConfig: {
    businessType: string | null;
    businessTypeLabel: string | null;
    primaryKpiLabel: string | null;
    targetValue: number | null;
    currency: string | null;
  } | null;
  // Replaces the old per-user metaConnection field (Phase C - see
  // AGENTS.md): which ad account a client sees is now admin-assigned
  // (AdAccountAssignment, Phase A/B), read-only from the client's side.
  adAccountAssignment:
    | { assigned: true; adAccountId: string; adAccountName: string | null }
    | { assigned: false };
  spendingControls: {
    monthlySpendCap: number | null;
  };
  notifications: {
    weeklySummary: boolean;
    needsAttention: boolean;
    metaAccessLost: boolean;
  };
  about: {
    appVersion: string;
    supportEmail: string;
  };
}
