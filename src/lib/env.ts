export function getAgentWebhook(agent: string): string | null {
  const key = `N8N_WEBHOOK_URL__${agent.toUpperCase()}`;
  return process.env[key] || null;
}

export function listAgents(): string[] {
  const prefix = "N8N_WEBHOOK_URL__";
  return Object.keys(process.env)
    .filter((k) => k.startsWith(prefix) && process.env[k])
    .map((k) => k.slice(prefix.length).toLowerCase())
    .sort();
}

export function getN8nTimeoutMs(): number {
  const raw = process.env.N8N_TIMEOUT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}
