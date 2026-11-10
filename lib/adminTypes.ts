// Shared shapes between the /api/admin/* route handlers and the admin
// ad-account-assignment page's client components - keeps the two from
// drifting independently (same convention as lib/settingsTypes.ts).

export interface AdminAdAccountRow {
  /** Always the "act_..." normalized form - see mcp-server/meta-client.ts's normalizeAdAccountId. */
  adAccountId: string;
  name: string | null;
  accountStatus: number;
  currency: string | null;
  assignedToEmail: string | null;
  assignedAt: string | null;
}

export interface AdminAdAccountsResponse {
  accounts: AdminAdAccountRow[];
}

export interface AdminUserSearchResult {
  id: string;
  email: string;
}
