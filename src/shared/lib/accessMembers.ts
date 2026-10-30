import { isSumzOrgEmail } from "@/shared/lib/memberMaps";

export type AccessMemberRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  aliases: string[];
  aliasesText?: string;
  createdAt?: number;
  updatedAt?: number;
};

export function formatAliases(list: string[] | null | undefined): string {
  return (list || []).join(", ");
}

export function parseAliases(text: string): string[] {
  return String(text || "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeAccessMember(raw: AccessMemberRow, now = Date.now()) {
  const email = String(raw.email || "").trim().toLowerCase();
  const name = String(raw.name || "").trim();
  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases.map((a) => String(a).trim()).filter(Boolean)
    : parseAliases(raw.aliasesText || "");
  const role = raw.role === "admin" ? "admin" : "member";
  const id =
    raw.id || (email ? `m-${email.split("@")[0].replace(/[^a-z0-9]+/gi, "-")}` : `m-${now}`);
  return {
    id,
    name: name || email.split("@")[0],
    email,
    aliases,
    role,
    createdAt: raw.createdAt || now,
    updatedAt: now,
  };
}

export function rowsFromMembers(members: AccessMemberRow[] | null | undefined): AccessMemberRow[] {
  return (members || []).map((m) => ({
    ...m,
    role: m.role === "admin" ? "admin" : "member",
    aliasesText: formatAliases(m.aliases),
  }));
}

export function validateAccessMembers(rows: AccessMemberRow[]): {
  ok: true;
  members: ReturnType<typeof normalizeAccessMember>[];
  allowedEmails: string[];
} | { ok: false; error: string } {
  const normalized = [];
  const emails = new Set<string>();
  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email) {
      return { ok: false, error: "Cada usuario necesita un correo @sumz.co" };
    }
    if (!isSumzOrgEmail(email)) {
      return { ok: false, error: `Solo correos Sumz (@sumz.co): ${email}` };
    }
    if (emails.has(email)) {
      return { ok: false, error: `Correo duplicado: ${email}` };
    }
    emails.add(email);
    normalized.push(
      normalizeAccessMember({
        ...row,
        email,
        aliases: parseAliases(row.aliasesText),
      })
    );
  }
  const admins = normalized.filter((m) => m.role === "admin");
  if (admins.length !== 1) {
    return { ok: false, error: "Debe haber exactamente un admin" };
  }
  return { ok: true, members: normalized, allowedEmails: [...emails] };
}
