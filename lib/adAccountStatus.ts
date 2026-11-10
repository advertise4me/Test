// Meta's `account_status` field on an ad account is a numeric enum - see
// https://developers.facebook.com/docs/marketing-api/reference/ad-account#account_status.
// Only the common codes are named here; anything else falls back to the raw
// number so the admin page never renders blank.
const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Disabled",
  3: "Unsettled",
  7: "Pending risk review",
  8: "Pending settlement",
  9: "In grace period",
  100: "Pending closure",
  101: "Closed",
  201: "Any active ad account",
  202: "Any closed ad account",
};

export function formatAdAccountStatus(status: number): string {
  return ACCOUNT_STATUS_LABELS[status] ?? `Status ${status}`;
}
