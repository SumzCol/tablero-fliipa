/** Markdown de prueba para tareas demo (GFM, código, Mermaid). */
export const DEMO_NOTE_SAMPLES = [
  `## Contexto

Tarea de prueba **minimalista** con notas en markdown.

- Responsable definido en el tablero
- Fecha límite opcional
- Etiqueta visible en la card

> Cita: validar filtros AND/OR con este contenido.`,

  `### Checklist

1. Reproducir en local
2. Adjuntar evidencia
3. Cerrar en *Done*

\`\`\`ts
export function hello(name: string) {
  return \`Hola, \${name}\`;
}
\`\`\``,

  `## Flujo de estados

\`\`\`mermaid
flowchart LR
  backlog[Pendiente] --> dev[En desarrollo]
  dev --> review[PR review]
  review --> done[Completado]
\`\`\`

Diagrama de referencia para QA.`,

  `## Tabla rápida

| Campo | Valor |
| --- | --- |
| Entorno | \`dev\` |
| Riesgo | Medio |

~~Obsoleto~~ → usar la columna **Pendiente**.`,

  `### Secuencia API

\`\`\`mermaid
sequenceDiagram
  participant U as Usuario
  participant A as API
  participant D as DB
  U->>A: POST /tasks
  A->>D: insert
  D-->>A: id
  A-->>U: 201 Created
\`\`\``,

  `## Notas libres

Texto con **negrita**, _cursiva_ y \`inline code\`.

- [ ] Pendiente
- [x] Hecho en demo`,

  `### Pie chart demo

\`\`\`mermaid
pie title Tipos en el tablero
  "Tarea" : 40
  "Incidencia" : 25
  "Funcionalidad" : 20
  "Mejora" : 15
\`\`\``,
];

/** Nota fija para probar Mermaid “grande” (tarea demo-12). */
export const ARCHITECTURE_DEMO_NOTE = `## Arquitectura Fliipa (inventada)

Diagrama de referencia para probar **Ver**, expandir notas y render Mermaid.

\`\`\`mermaid
flowchart TB
  subgraph clients["Capa cliente"]
    WEB["Portal web"]
    MOB["App móvil"]
    ADMIN["Consola admin"]
  end

  subgraph edge["Edge y seguridad"]
    CDN["CDN estáticos"]
    WAF["WAF"]
    GW["API Gateway"]
  end

  subgraph core["Servicios core"]
    AUTH["Auth OIDC"]
    TASKS["Tasks svc"]
    BOARD["Board realtime"]
    EXPORT["Export / backup"]
  end

  subgraph data["Datos y mensajería"]
    PG[(PostgreSQL)]
    REDIS[(Redis)]
    KAFKA{{Event bus}}
    S3[(Object store)]
  end

  subgraph obs["Observabilidad"]
    OTEL["OpenTelemetry"]
    GRAF["Dashboards"]
    ALERT["Alerting"]
  end

  WEB --> CDN
  MOB --> WAF
  ADMIN --> WAF
  CDN --> WAF
  WAF --> GW

  GW --> AUTH
  GW --> TASKS
  GW --> BOARD
  GW --> EXPORT

  AUTH --> REDIS
  AUTH --> PG
  TASKS --> PG
  TASKS --> KAFKA
  BOARD --> REDIS
  BOARD --> KAFKA
  EXPORT --> S3
  EXPORT --> PG

  TASKS --> OTEL
  BOARD --> OTEL
  AUTH --> OTEL
  OTEL --> GRAF
  GRAF --> ALERT
\`\`\`

### Leyenda rápida

| Zona | Rol |
| --- | --- |
| Edge | Terminación TLS, rate limit, routing |
| Core | Lógica de negocio del tablero |
| Datos | Persistencia y eventos async |
`;

export function demoNoteForIndex(index) {
  return DEMO_NOTE_SAMPLES[index % DEMO_NOTE_SAMPLES.length];
}
