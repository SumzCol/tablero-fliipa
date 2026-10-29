const DEMO_STATUSES = [
  "backlog",
  "blocked",
  "in_progress",
  "review",
  "dev_qa",
  "product_qa",
  "done",
];

const DEMO_ASSIGNEES = ["Mafe", "Fran", "William", "Aleja", "Alejo", "Ivan", ""];

import { ARCHITECTURE_DEMO_NOTE, demoNoteForIndex } from "./demoNoteSamples.js";

const DEMO_TYPES = ["Bug", "Feature", "Task", "Mejora"];

const DEMO_VERBS = [
  "Fix",
  "Implementar",
  "Revisar",
  "Optimizar",
  "Documentar",
  "Probar",
  "Migrar",
  "Diseñar",
  "Refactor",
  "Investigar",
];

const DEMO_TOPICS = [
  "checkout",
  "pagos",
  "login OAuth",
  "API de listados",
  "dashboard KPI",
  "onboarding móvil",
  "webhook Stripe",
  "imágenes en CDN",
  "notificaciones email",
  "precios plan anual",
  "sesión Safari",
  "logs CloudWatch",
  "export CSV",
  "permisos admin",
  "cache Redis",
  "búsqueda full-text",
  "formulario KYC",
  "métricas comité",
];

/** @param {number} count */
function buildDemoRows(count = 54) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const verb = DEMO_VERBS[i % DEMO_VERBS.length];
    const topic = DEMO_TOPICS[(i * 7) % DEMO_TOPICS.length];
    rows.push({
      id: `demo-${i + 1}`,
      title: `${verb} ${topic} (${i + 1})`,
      assignee: DEMO_ASSIGNEES[i % DEMO_ASSIGNEES.length],
      status: DEMO_STATUSES[i % DEMO_STATUSES.length],
      type: DEMO_TYPES[i % DEMO_TYPES.length],
    });
  }
  return rows;
}

/** Decenas de tareas variadas para probar filtros AND/OR (ids demo-1 … demo-N). */
export function minimalFilterDemoTasks(count = 54) {
  const day = 86400000;
  const now = Date.now();
  const ts = (daysAgo, extra = 0) => now - daysAgo * day + extra;

  return buildDemoRows(count).map((t, i) => ({
    ...t,
    description: t.id === "demo-12" ? ARCHITECTURE_DEMO_NOTE : demoNoteForIndex(i),
    blocked: t.status === "blocked",
    createdAt: ts((i % 28) + 1),
    statusChangedAt: ts(i % 14, i * 500),
    updatedAt: ts(i % 14, i * 500),
    dueDate: null,
  }));
}
