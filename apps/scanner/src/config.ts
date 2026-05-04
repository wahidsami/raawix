export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  apiKey: process.env.API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  reportUiOrigin: process.env.REPORT_UI_ORIGIN || 'http://localhost:5173',
  // Password reset (forgot/reset flow)
  passwordResetExpiryMs: parseInt(process.env.PASSWORD_RESET_EXPIRY_MS || '3600000', 10), // 1 hour
  // Resend (optional; if unset, welcome and reset emails are skipped)
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
  maxConcurrentScans: parseInt(process.env.MAX_CONCURRENT_SCANS || '5', 10),
  outputDir: process.env.OUTPUT_DIR || './output',
  allowedPorts: process.env.ALLOWED_PORTS
    ? process.env.ALLOWED_PORTS.split(',').map((p) => parseInt(p.trim(), 10))
    : [80, 443], // Default to web-safe ports only
  allowLocalhost: process.env.ALLOW_LOCALHOST === 'true', // Default false (must be explicitly enabled)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10), // limit each IP to 200 requests per windowMs (increased for development)
  },
  quotas: {
    maxPagesHardLimit: parseInt(process.env.MAX_PAGES_HARD_LIMIT || '500', 10), // Updated for large government sites
    maxDepthHardLimit: parseInt(process.env.MAX_DEPTH_HARD_LIMIT || '20', 10), // Max depth cap (increased for complex sites)
    maxRuntimeMs: parseInt(process.env.MAX_RUNTIME_MS || '10800000', 10), // 180 minutes (3 HOURS - plenty of time for large government sites!)
    sequentialPageTimeoutMs: parseInt(process.env.SEQUENTIAL_PAGE_TIMEOUT_MS || '120000', 10),
    sequentialScanMinRuntimeMs: parseInt(process.env.SEQUENTIAL_SCAN_MIN_RUNTIME_MS || '600000', 10),
  },
  // Dynamic settings (can be overridden via API/Settings page)
  getDynamicQuotas: async () => {
    try {
      const { getScannerSettings } = await import('./config/scanner-settings.js');
      const settings = await getScannerSettings();
      return {
        maxPages: settings.maxPages,
        maxDepth: settings.maxDepth,
        maxRuntimeMs: (settings as any).maxRuntimeMinutes ? (settings as any).maxRuntimeMinutes * 60 * 1000 : settings.maxRuntimeMs, // Convert minutes to ms
      };
    } catch {
      // Fallback to static values if settings module not available
      return {
        maxPages: config.quotas.maxPagesHardLimit,
        maxDepth: config.quotas.maxDepthHardLimit,
        maxRuntimeMs: config.quotas.maxRuntimeMs,
      };
    }
  },
  urlPolicy: {
    sameOriginOnly: process.env.SAME_ORIGIN_ONLY === 'true',
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
      : [],
  },
  audit: {
    enabled: process.env.AUDIT_LOGGING !== 'false',
    logDir: process.env.AUDIT_LOG_DIR || './logs',
  },
  artifacts: {
    // Keep a11y snapshot generation enabled by default for backward compatibility.
    // Can be disabled to reduce output size once semantic coverage is sufficient.
    writeA11ySnapshot: process.env.WRITE_A11Y_SNAPSHOT !== 'false',
  },
  raawi: {
    enabled: process.env.RAAWI_AGENT_ENABLED !== 'false', // Default enabled to preserve current deployments unless explicitly disabled
    execution: {
      enabled: process.env.RAAWI_EXECUTION_AGENT_ENABLED === 'true', // Default off for safe rollout
      enableNonLoginGoals: process.env.RAAWI_EXECUTION_NON_LOGIN_ENABLED === 'true', // Default off for safe rollout
      loginUsername: process.env.RAAWI_AGENT_LOGIN_USERNAME || '',
      loginPassword: process.env.RAAWI_AGENT_LOGIN_PASSWORD || '',
      searchQuery: process.env.RAAWI_AGENT_SEARCH_QUERY || 'accessibility',
      navigateTarget:
        process.env.RAAWI_AGENT_NAVIGATE_TARGET ||
        '/contact',
      formDefaults: {
        name: process.env.RAAWI_AGENT_FORM_NAME || 'Raawi QA',
        email: process.env.RAAWI_AGENT_FORM_EMAIL || 'qa@raawi.local',
        message:
          process.env.RAAWI_AGENT_FORM_MESSAGE ||
          'Automated semantic agent test message.',
      },
    },
  },
  auth: {
    credentialEncryptionKey: process.env.AUTH_CREDENTIAL_ENCRYPTION_KEY || '',
  },
  retention: {
    enabled: process.env.SCAN_RETENTION_ENABLED !== 'false',
    days: parseInt(process.env.SCAN_RETENTION_DAYS || '7', 10), // Default 7 days
  },
  vision: {
    enabled: process.env.VISION_ENABLED !== 'false', // Default enabled
    ocrEnabled: process.env.VISION_OCR_ENABLED === 'true', // Default disabled
    maxCandidatesPerPage: parseInt(process.env.VISION_MAX_CANDIDATES_PER_PAGE || '80', 10),
  },
  gemini: {
    enabled: process.env.GEMINI_ENABLED === 'true', // Default disabled
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    maxChars: parseInt(process.env.GEMINI_MAX_CHARS || '4000', 10),
    maxImageBytes: parseInt(process.env.GEMINI_MAX_IMAGE_BYTES || '10485760', 10), // 10MB default
    maxImagesPerScan: parseInt(process.env.GEMINI_MAX_IMAGES_PER_SCAN || '50', 10), // Rate limit per scan
  },
  agent: {
    enabled: process.env.AGENT_ENABLED !== 'false', // Default enabled
    maxSteps: parseInt(process.env.AGENT_MAX_STEPS || '50', 10),
    maxMs: parseInt(process.env.AGENT_MAX_MS || '10000', 10),
    probesEnabled: process.env.AGENT_PROBES_ENABLED !== 'false', // Default enabled
  },
  openai: {
    enabled: process.env.OPENAI_ENABLED !== 'false', // Default enabled
    apiKey: process.env.OPENAI_API_KEY || '',
    // Default text model for translation/report text.
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    // Default multimodal model for OCR/image descriptions.
    visionModel: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    maxChars: parseInt(process.env.OPENAI_MAX_CHARS || '4000', 10),
    maxImageBytes: parseInt(process.env.OPENAI_MAX_IMAGE_BYTES || '10485760', 10),
    maxImagesPerScan: parseInt(process.env.OPENAI_MAX_IMAGES_PER_SCAN || '50', 10),
    requestTimeoutMs: parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS || '15000', 10),
    visionElementEnrichment: process.env.OPENAI_VISION_ELEMENT_ENRICHMENT === 'true', // Default off; per-element calls can be slow.
  },
  agentAnalyst: {
    enabled: process.env.AGENT_ANALYST_ENABLED !== 'false', // Default enabled
    maxPagesPerScan: parseInt(process.env.AGENT_ANALYST_MAX_PAGES || '10', 10),
    maxIssuesPerPage: parseInt(process.env.AGENT_ANALYST_MAX_ISSUES || '20', 10),
    cacheTtlMs: parseInt(process.env.AGENT_ANALYST_CACHE_TTL_MS || '604800000', 10), // 7d
  },
  database: {
    url: process.env.DATABASE_URL || '',
    enabled: !!process.env.DATABASE_URL, // Only enabled if DATABASE_URL is set
  },
};
