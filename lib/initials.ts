// Derives display initials for the avatar from an account email (the User
// model has no display name field - see prisma/schema.prisma).
export function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.slice(0, 1).toUpperCase() || "?";
}
