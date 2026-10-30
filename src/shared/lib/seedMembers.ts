/** Semilla compartida cliente/servidor (allowlist Sumz). */
export type BoardMemberSeed = {
  id: string;
  name: string;
  email: string;
  aliases: string[];
  role: "admin" | "member";
};

export const SEED_MEMBERS: BoardMemberSeed[] = [
  {
    id: "m-mafe",
    name: "Mafe",
    email: "mf.herazo@sumz.co",
    aliases: ["Maria fernanda herazo escobar", "María Fernanda Herazo"],
    role: "member",
  },
  {
    id: "m-fran",
    name: "Fran",
    email: "fj.martinez@sumz.co",
    aliases: [],
    role: "admin",
  },
  {
    id: "m-alejo",
    name: "Alejo",
    email: "da.aviles@sumz.co",
    aliases: [],
    role: "member",
  },
  {
    id: "m-aleja",
    name: "Aleja",
    email: "a.suarez@sumz.co",
    aliases: ["Ale Suárez"],
    role: "member",
  },
  {
    id: "m-ivan",
    name: "Ivan",
    email: "if.aponte@sumz.co",
    aliases: ["Iván Aponte"],
    role: "member",
  },
  {
    id: "m-william",
    name: "William",
    email: "wa.bohorquez@sumz.co",
    aliases: ["Alejandro Bohorquez"],
    role: "member",
  },
  {
    id: "m-whitte",
    name: "whitte",
    email: "ja.blanco@sumz.co",
    aliases: ["white", "whitte", "Jorge Antonio Blanco"],
    role: "member",
  },
  {
    id: "m-nicolas",
    name: "Nicolás",
    email: "n.ibagon@sumz.co",
    aliases: ["Nicolás Ibagón", "Nicolas Ibagon"],
    role: "member",
  },
];

export type BoardMemberRecord = BoardMemberSeed & {
  createdAt?: number;
  updatedAt?: number;
};

function memberStamp(item: BoardMemberRecord | null | undefined): number {
  return (item && (item.updatedAt || item.createdAt)) || 0;
}

function uniqStrings(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const s = String(raw || "").trim();
    if (!s) continue;
    const key = s.toLocaleLowerCase("es");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Combina dos versiones del mismo miembro sin perder correo, rol ni alias. */
export function mergeTwoMemberRecords(
  a: BoardMemberRecord,
  b: BoardMemberRecord
): BoardMemberRecord {
  const primary = memberStamp(a) >= memberStamp(b) ? a : b;
  const secondary = primary === a ? b : a;
  return {
    ...primary,
    id: primary.id || secondary.id,
    name: primary.name || secondary.name,
    email: String(primary.email || secondary.email || "")
      .trim()
      .toLowerCase(),
    role: primary.role === "admin" || secondary.role === "admin" ? "admin" : "member",
    aliases: uniqStrings([...(primary.aliases || []), ...(secondary.aliases || [])]),
    createdAt: Math.min(
      primary.createdAt || memberStamp(primary) || Date.now(),
      secondary.createdAt || memberStamp(secondary) || Date.now()
    ),
    updatedAt: Math.max(memberStamp(primary), memberStamp(secondary)),
  };
}

function findSeedForRecord(raw: BoardMemberRecord): BoardMemberSeed | null {
  const id = String(raw.id || "").trim();
  if (id) {
    const byId = SEED_MEMBERS.find((s) => s.id === id);
    if (byId) return byId;
  }
  const email = String(raw.email || "")
    .trim()
    .toLowerCase();
  if (email) {
    const byEmail = SEED_MEMBERS.find((s) => s.email === email);
    if (byEmail) return byEmail;
  }
  const folded = String(raw.name || "")
    .trim()
    .toLocaleLowerCase("es");
  if (folded) {
    const byName = SEED_MEMBERS.find((s) => s.name.toLocaleLowerCase("es") === folded);
    if (byName) return byName;
  }
  return null;
}

/** Rellena correos/alias desde semilla y asegura que el roster Sumz completo exista. */
export function hydrateBoardMembers(list: BoardMemberRecord[] | null | undefined): BoardMemberRecord[] {
  const now = Date.now();
  const map = new Map<string, BoardMemberRecord>();

  for (const raw of list || []) {
    if (!raw || !raw.id) continue;
    const seed = findSeedForRecord(raw);
    const merged: BoardMemberRecord = {
      id: raw.id,
      name: raw.name || seed?.name || raw.id,
      email: String(raw.email || seed?.email || "")
        .trim()
        .toLowerCase(),
      role: raw.role === "admin" || seed?.role === "admin" ? "admin" : raw.role === "member" ? "member" : seed?.role || "member",
      aliases: uniqStrings([...(raw.aliases || []), ...(seed?.aliases || [])]),
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || raw.createdAt || now,
    };
    map.set(merged.id, merged);
  }

  for (const seed of SEED_MEMBERS) {
    if (map.has(seed.id)) {
      const cur = map.get(seed.id)!;
      map.set(
        seed.id,
        mergeTwoMemberRecords(cur, {
          ...seed,
          createdAt: cur.createdAt,
          updatedAt: cur.updatedAt,
        })
      );
      continue;
    }
    const byEmail = [...map.values()].find(
      (m) => m.email && m.email === seed.email
    );
    if (byEmail) {
      map.delete(byEmail.id);
      map.set(
        seed.id,
        mergeTwoMemberRecords(byEmail, {
          ...seed,
          createdAt: byEmail.createdAt,
          updatedAt: byEmail.updatedAt,
        })
      );
      continue;
    }
    map.set(seed.id, {
      ...seed,
      createdAt: now,
      updatedAt: now,
    });
  }

  const seedIds = new Set(SEED_MEMBERS.map((s) => s.id));
  const seedOrdered = SEED_MEMBERS.map((s) => map.get(s.id)).filter(Boolean) as BoardMemberRecord[];
  const extras = [...map.values()]
    .filter((m) => !seedIds.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return [...seedOrdered, ...extras];
}
