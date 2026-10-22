/**
 * Provider Telemetry and Sanitization Helper
 * Provides structured, sanitized diagnostics for AI vision enrichment
 * WITHOUT leaking API keys, auth headers, base64 images, or raw error bodies.
 */

export type ProviderName = 'gemini' | 'openai' | 'none';

export type DiagnosticStatus =
  | 'provider_disabled'
  | 'success'
  | 'http_error'
  | 'network_error'
  | 'size_limit_exceeded'
  | 'empty_response'
  | 'unknown_error'
  | 'rate_limit_exceeded'
  | 'quota_exhausted'
  | 'service_unavailable'
  | 'request_budget_exhausted'
  | 'timeout';

export type ErrorCategory =
  | 'http_error'
  | 'network_error'
  | 'size_limit_exceeded'
  | 'empty_response'
  | 'unknown_error'
  | 'rate_limit_exceeded'
  | 'quota_exhausted'
  | 'service_unavailable'
  | 'request_budget_exhausted'
  | 'request_timeout';

export interface SanitizedProviderDiagnostics {
  provider: ProviderName;
  operation: 'extract_text' | 'describe_element';
  status: DiagnosticStatus;
  httpStatus?: number;
  errorCategory?: ErrorCategory;
  incorporated?: boolean;
  latencyMs?: number;
}

export interface AssistiveMapProviderTelemetry {
  provider: ProviderName;
  labelOverridesAttempted: number;
  labelOverridesSucceeded: number;
  imageDescriptionsAttempted: number;
  imageDescriptionsSucceeded: number;
  cropsUsed: number;
  viewportFallbacksUsed: number;
  failures: Array<{
    operation: 'label_override' | 'image_description';
    status: DiagnosticStatus;
    httpStatus?: number;
    errorCategory?: ErrorCategory;
    latencyMs?: number;
  }>;
}

/**
 * Creates a sanitized diagnostic record from a vision provider execution.
 * Guaranteed to exclude any credentials, headers, prompts, base64 payloads, or raw error strings.
 */
export function createProviderDiagnostics(
  provider: ProviderName,
  operation: 'extract_text' | 'describe_element',
  resultTextOrDescription: string | null | undefined,
  rawResponse: any,
  incorporated: boolean = false
): SanitizedProviderDiagnostics {
  if (provider === 'none' || (!rawResponse && !resultTextOrDescription)) {
    return {
      provider: 'none',
      operation,
      status: 'provider_disabled',
      incorporated: false,
    };
  }

  const latencyMs =
    rawResponse && typeof rawResponse.latencyMs === 'number' && Number.isFinite(rawResponse.latencyMs)
      ? Math.max(0, Math.round(rawResponse.latencyMs))
      : undefined;

  // 1. Success: Text or description was obtained
  if (resultTextOrDescription && resultTextOrDescription.trim().length > 0) {
    return {
      provider,
      operation,
      status: 'success',
      httpStatus: 200,
      incorporated,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  const explicitCategory = rawResponse && typeof rawResponse.category === 'string' ? rawResponse.category : undefined;
  const statusNumber = rawResponse && typeof rawResponse.status === 'number' ? rawResponse.status : undefined;
  const errorStr = rawResponse && typeof rawResponse.error === 'string' ? rawResponse.error : '';

  // 2. Request budget exhausted
  if (explicitCategory === 'request_budget_exhausted' || /budget exhausted/i.test(errorStr)) {
    return {
      provider,
      operation,
      status: 'request_budget_exhausted',
      httpStatus: statusNumber || 429,
      errorCategory: 'request_budget_exhausted',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 3. Quota exhausted vs Rate limit exceeded
  if (
    explicitCategory === 'quota_exhausted' ||
    (statusNumber === 429 && /quota|resource_exhausted|exhausted/i.test(errorStr))
  ) {
    return {
      provider,
      operation,
      status: 'quota_exhausted',
      httpStatus: 429,
      errorCategory: 'quota_exhausted',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  if (
    explicitCategory === 'rate_limit_exceeded' ||
    statusNumber === 429 ||
    /rate limit|too many requests/i.test(errorStr)
  ) {
    return {
      provider,
      operation,
      status: 'rate_limit_exceeded',
      httpStatus: 429,
      errorCategory: 'rate_limit_exceeded',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 4. Request timeout (HTTP 408 or category/error string)
  if (
    explicitCategory === 'request_timeout' ||
    statusNumber === 408 ||
    /request timeout|timed out|abort/i.test(errorStr)
  ) {
    return {
      provider,
      operation,
      status: 'timeout',
      httpStatus: statusNumber || 408,
      errorCategory: 'request_timeout',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 5. Service unavailable (HTTP 503)
  if (
    explicitCategory === 'service_unavailable' ||
    statusNumber === 503 ||
    /service unavailable/i.test(errorStr)
  ) {
    return {
      provider,
      operation,
      status: 'service_unavailable',
      httpStatus: 503,
      errorCategory: 'service_unavailable',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 6. Size limit exceeded
  if (explicitCategory === 'size_limit_exceeded' || /size limit|too large/i.test(errorStr)) {
    return {
      provider,
      operation,
      status: 'size_limit_exceeded',
      errorCategory: 'size_limit_exceeded',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 7. Generic HTTP Error: rawResponse contains numeric status code >= 400
  if (statusNumber && statusNumber >= 400) {
    return {
      provider,
      operation,
      status: 'http_error',
      httpStatus: statusNumber,
      errorCategory: 'http_error',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 8. Network error (connection refused, DNS, socket)
  if (
    explicitCategory === 'network_error' ||
    /network|fetch|econnrefused|enotfound|socket/i.test(errorStr)
  ) {
    return {
      provider,
      operation,
      status: 'network_error',
      errorCategory: 'network_error',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 9. Empty Response: Provider returned response without text/description
  if (!errorStr) {
    return {
      provider,
      operation,
      status: 'empty_response',
      httpStatus: 200,
      errorCategory: 'empty_response',
      incorporated: false,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    };
  }

  // 10. Unknown Error
  return {
    provider,
    operation,
    status: 'unknown_error',
    errorCategory: 'unknown_error',
    incorporated: false,
    ...(latencyMs !== undefined ? { latencyMs } : {}),
  };
}
