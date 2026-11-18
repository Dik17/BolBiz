// Central configuration. Every secret comes from the environment — never from code or the repo.
const env = process.env;

const int = (v, d) => (Number.isFinite(Number.parseInt(v, 10)) ? Number.parseInt(v, 10) : d);

export const config = Object.freeze({
  port: int(env.PORT, 3000),
  publicBaseUrl: (env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  dataDir: env.DATA_DIR || './data',
  trustProxy: env.TRUST_PROXY ?? '1',

  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY || '',
    // Model routing: Sonnet drives the multi-step agent, Haiku handles cheap high-volume steps.
    agentModel: env.AGENT_MODEL || 'claude-sonnet-5-5',
    fastModel: env.FAST_MODEL || 'claude-haiku-5-5',
    maxAgentSteps: int(env.MAX_AGENT_STEPS, 8),
    maxTokens: int(env.AGENT_MAX_TOKENS, 4096),
  },

  godaddy: {
    // Personal Access Token from developer.godaddy.com (scope: domains.domain:read)
    pat: env.GODADDY_PAT || '',
    baseUrl: env.GODADDY_API_BASE || 'https://api.godaddy.com',
  },

  smtp: {
    host: env.SMTP_HOST || 'smtpout.secureserver.net',
    port: int(env.SMTP_PORT, 465),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.SMTP_FROM || env.SMTP_USER || '',
    contactTo: env.CONTACT_TO || env.SMTP_USER || '',
  },
});

export const isConfigured = {
  claude: () => Boolean(config.anthropic.apiKey),
  godaddy: () => Boolean(config.godaddy.pat),
  smtp: () => Boolean(config.smtp.user && config.smtp.pass),
};
