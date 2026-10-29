/** @typedef {'and' | 'or'} FilterCombinator */
/** @typedef {'title' | 'status' | 'assignee'} FilterProperty */

/**
 * @typedef {Object} FilterRule
 * @property {'rule'} type
 * @property {string} id
 * @property {FilterProperty} property
 * @property {string} value
 */

/**
 * @typedef {Object} FilterGroup
 * @property {'group'} type
 * @property {string} id
 * @property {FilterCombinator} combinator
 * @property {(FilterRule | FilterGroup)[]} children
 */

export const MINIMAL_FILTER_PROPERTIES = [
  { id: "title", label: "Título", input: "text" },
  { id: "status", label: "Estado", input: "status" },
  { id: "assignee", label: "Responsable", input: "assignee" },
];

export const MINIMAL_ASSIGNEE_UNASSIGNED = "__unassigned__";

export function newFilterId() {
  return `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** @returns {FilterGroup} */
export function createFilterGroup(combinator = "and") {
  return { type: "group", id: newFilterId(), combinator, children: [] };
}

/** @returns {FilterRule} */
export function createFilterRule(property = "title", value = "") {
  return { type: "rule", id: newFilterId(), property, value };
}

/** @param {FilterGroup | null | undefined} root */
export function filterRootIsEmpty(root) {
  return !root || !root.children || root.children.length === 0;
}

/** @param {FilterGroup} root @param {string} nodeId */
export function removeFilterNode(root, nodeId) {
  if (root.id === nodeId) return null;
  return pruneGroup(root, nodeId);
}

function pruneGroup(group, nodeId) {
  const children = group.children
    .filter((c) => c.id !== nodeId)
    .map((c) => (c.type === "group" ? pruneGroup(c, nodeId) : c));
  return { ...group, children };
}

/** @param {FilterGroup} root @param {string} groupId @param {FilterRule | FilterGroup} node */
export function appendToFilterGroup(root, groupId, node) {
  return mapGroups(root, groupId, (g) => ({ ...g, children: [...g.children, node] }));
}

/** @param {FilterGroup} root @param {string} groupId @param {Partial<FilterGroup>} patch */
export function patchFilterGroup(root, groupId, patch) {
  return mapGroups(root, groupId, (g) => ({ ...g, ...patch }));
}

/** @param {FilterGroup} root @param {string} ruleId @param {Partial<FilterRule>} patch */
export function patchFilterRule(root, ruleId, patch) {
  return mapRules(root, ruleId, (r) => ({ ...r, ...patch }));
}

function mapGroups(node, groupId, fn) {
  if (node.type !== "group") return node;
  if (node.id === groupId) return fn(node);
  return {
    ...node,
    children: node.children.map((c) => (c.type === "group" ? mapGroups(c, groupId, fn) : c)),
  };
}

function mapRules(node, ruleId, fn) {
  if (node.type !== "group") return node;
  return {
    ...node,
    children: node.children.map((c) => {
      if (c.type === "rule") return c.id === ruleId ? fn(c) : c;
      return mapRules(c, ruleId, fn);
    }),
  };
}

function evaluateRule(task, rule, helpers) {
  if (!rule.value && rule.property !== "assignee") return true;
  switch (rule.property) {
    case "title":
      return helpers.textMatches(rule.value, task.title);
    case "status":
      return task.status === rule.value;
    case "assignee":
      if (rule.value === MINIMAL_ASSIGNEE_UNASSIGNED) return !task.assignee;
      return helpers.samePerson(task.assignee, rule.value);
    default:
      return true;
  }
}

function evaluateGroup(task, group, helpers) {
  if (!group.children.length) return true;
  const results = group.children.map((child) =>
    child.type === "rule" ? evaluateRule(task, child, helpers) : evaluateGroup(task, child, helpers)
  );
  return group.combinator === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** @param {FilterGroup | null | undefined} root */
export function taskMatchesMinimalFilterRoot(task, root, helpers) {
  if (filterRootIsEmpty(root)) return true;
  return evaluateGroup(task, root, helpers);
}

/**
 * @param {FilterRule} rule
 * @param {{ statusLabel: (id: string) => string, assigneeLabel: (v: string) => string }} ctx
 */
export function describeFilterRule(rule, ctx) {
  if (!rule.value && rule.property !== "assignee") return "";
  switch (rule.property) {
    case "title":
      return `con título que contiene «${rule.value}»`;
    case "status":
      return `en ${ctx.statusLabel(rule.value)}`;
    case "assignee":
      if (rule.value === MINIMAL_ASSIGNEE_UNASSIGNED) return "sin responsable asignado";
      return `de ${ctx.assigneeLabel(rule.value)}`;
    default:
      return "";
  }
}

/**
 * @param {FilterRule | FilterGroup} node
 * @param {object} ctx
 * @param {boolean} [nested]
 */
function describeNode(node, ctx, nested = false) {
  if (node.type === "rule") return describeFilterRule(node, ctx);
  if (!node.children.length) return "";
  const parts = node.children.map((c) => describeNode(c, ctx, true)).filter(Boolean);
  if (!parts.length) return "";
  const joiner = node.combinator === "or" ? " o " : " y ";
  let text = parts.join(joiner);
  if (nested && parts.length > 1) text = `(${text})`;
  return text;
}

/** @returns {string | null} Full sentence or null if no filters */
export function describeFilterRoot(root, ctx) {
  if (filterRootIsEmpty(root)) return null;
  const body = describeNode(root, ctx, false);
  if (!body) return null;
  return `Tareas ${body}`;
}

/** Collect all rules for chips */
export function collectFilterRules(root, out = []) {
  if (!root || root.type !== "group") return out;
  for (const child of root.children) {
    if (child.type === "rule") out.push(child);
    else collectFilterRules(child, out);
  }
  return out;
}
