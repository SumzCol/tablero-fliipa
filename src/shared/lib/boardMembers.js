import { foldName, resolvePersonNick } from "@/integrations/plane";
import { LEGACY_PERSON_LABEL_MAP } from "@/shared/lib/memberMaps";
import { BOOTSTRAP_ADMIN_EMAIL, SEED_MEMBERS } from "@/shared/lib/seedMembers";

let membersRef = [];

export function setBoardMembersRegistry(members) {
  membersRef = Array.isArray(members) ? members : [];
}

export function memberLabels(member) {
  if (!member) return [];
  const out = new Set();
  if (member.name) out.add(member.name);
  (member.aliases || []).forEach((a) => out.add(a));
  return [...out];
}

export function findMemberByLabel(label, members = membersRef) {
  const needle = foldName(label);
  if (!needle) return null;
  for (const m of members || []) {
    for (const lab of memberLabels(m)) {
      if (foldName(lab) === needle) return m;
    }
    if (m.email && foldName(m.email.split("@")[0]) === needle) return m;
  }
  return null;
}

export function resolveBoardPersonNick(name, members = membersRef) {
  const raw = String(name || "").trim();
  const mapped = LEGACY_PERSON_LABEL_MAP[raw] || raw;
  const hit = findMemberByLabel(mapped, members);
  if (hit?.name) return hit.name;
  return resolvePersonNick(mapped);
}

export function sameBoardPerson(a, b, members = membersRef) {
  if (!a || !b) return false;
  if (a === b) return true;
  return foldName(resolveBoardPersonNick(a, members)) === foldName(resolveBoardPersonNick(b, members));
}

export function memberForAuthUser(user, members = membersRef) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) return null;
  return (members || []).find((m) => String(m.email || "").trim().toLowerCase() === email) || null;
}

export function authUserEmail(user, fallbackEmail = "") {
  return String(user?.email || fallbackEmail || "")
    .trim()
    .toLowerCase();
}

export function isAuthUserAdmin(user, members = membersRef, fallbackEmail = "") {
  const email = authUserEmail(user, fallbackEmail);
  if (!email) return false;
  const m =
    memberForAuthUser(user, members) ||
    (members || []).find((x) => String(x.email || "").trim().toLowerCase() === email) ||
    null;
  if (m?.role === "admin") return true;
  if (email === BOOTSTRAP_ADMIN_EMAIL) return true;
  return SEED_MEMBERS.some((s) => s.role === "admin" && s.email === email);
}
