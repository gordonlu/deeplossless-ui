// ── Shared tool classification ──────────────────────────────────────────
// Single source of truth for mapping tool names → semantic categories.

export const TOOL_CATEGORIES: Record<string, { category: string; icon: string; color: string }> = {
  grep: { category: "inspection", icon: "◎", color: "#00D1B2" },
  rg: { category: "inspection", icon: "◎", color: "#00D1B2" },
  find: { category: "inspection", icon: "◎", color: "#00D1B2" },
  search: { category: "inspection", icon: "◎", color: "#00D1B2" },
  ls: { category: "inspection", icon: "◎", color: "#00D1B2" },
  cat: { category: "read", icon: "◈", color: "#7EB8FF" },
  head: { category: "read", icon: "◈", color: "#7EB8FF" },
  tail: { category: "read", icon: "◈", color: "#7EB8FF" },
  read_file: { category: "read", icon: "◈", color: "#7EB8FF" },
  cargo_test: { category: "verification", icon: "✓", color: "#00D1B2" },
  "cargo test": { category: "verification", icon: "✓", color: "#00D1B2" },
  pytest: { category: "verification", icon: "✓", color: "#00D1B2" },
  "npm test": { category: "verification", icon: "✓", color: "#00D1B2" },
  cargo_build: { category: "build", icon: "⚙", color: "#FFB020" },
  "cargo build": { category: "build", icon: "⚙", color: "#FFB020" },
  cargo_check: { category: "build", icon: "⚙", color: "#FFB020" },
  "cargo check": { category: "build", icon: "⚙", color: "#FFB020" },
  make: { category: "build", icon: "⚙", color: "#FFB020" },
  git_diff: { category: "validation", icon: "⇔", color: "#FCEE0A" },
  "git diff": { category: "validation", icon: "⇔", color: "#FCEE0A" },
  git: { category: "validation", icon: "⇔", color: "#FCEE0A" },
  rm: { category: "mutation", icon: "✎", color: "#FF5454" },
  mv: { category: "mutation", icon: "✎", color: "#FF5454" },
  write: { category: "mutation", icon: "✎", color: "#FF5454" },
  edit: { category: "mutation", icon: "✎", color: "#FF5454" },
  curl: { category: "network", icon: "↗", color: "#C084FC" },
  wget: { category: "network", icon: "↗", color: "#C084FC" },
  exec: { category: "exec", icon: "▶", color: "#7A7A7A" },
  bash: { category: "exec", icon: "▶", color: "#7A7A7A" },
  process: { category: "exec", icon: "▶", color: "#7A7A7A" },
};

export function classifyTool(toolName: string): { category: string; icon: string; color: string } {
  const key = toolName.toLowerCase().replace(/[_-]/g, "");
  if (TOOL_CATEGORIES[toolName]) return TOOL_CATEGORIES[toolName];
  for (const [k, v] of Object.entries(TOOL_CATEGORIES)) {
    if (key.includes(k.replace(/[_-]/g, ""))) return v;
  }
  return { category: "exec", icon: "▶", color: "#7A7A7A" };
}

export function mapEventType(kind: string, payload?: string): string {
  if (kind !== "execution_completed") return kind;
  try {
    const v = JSON.parse(payload || "{}");
    if (v.tool_name) return classifyTool(v.tool_name).category;
  } catch {}
  return "exec";
}
