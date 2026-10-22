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
  | 'unknown_error';

export type ErrorCategory =
  | 'http_error'
  | 'network_error'
  | 'size_limit_exceeded'
  | 'empty_response'
  | 'unknown_error';

export interface SanitizedProviderDiagnostics {
  provider: ProviderName;
  operation: 'extract_text' | 'describe_element';
  status: DiagnosticStatus;
  httpStatus?: number;
  errorCategory?: ErrorCategory;
  incorporated?: boolean;
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

  // 1. Success: Text or description was obtained
  if (resultTextOrDescription && resultTextOrDescription.trim().length > 0) {
    return {
      provider,
      operation,
      status: 'success',
      httpStatus: 200,
      incorporated,
    };
  }

  // 2. HTTP Error: rawResponse contains numeric status code >= 400
  if (rawResponse && typeof rawResponse.status === 'number' && rawResponse.status >= 400) {
    return {
      provider,
      operation,
      status: 'http_error',
      httpStatus: rawResponse.status,
      errorCategory: 'http_error',
      incorporated: false,
    };
  }

  // 3. Category inspection from error string (without storing the string itself)
  const errorStr = rawResponse && typeof rawResponse.error === 'string' ? rawResponse.error : '';

  if (/size limit|too large/i.test(errorStr)) {
    return {
      provider,
      operation,
      status: 'size_limit_exceeded',
      errorCategory: 'size_limit_exceeded',
      incorporated: false,
    };
  }

  if (/network|fetch|timeout|econnrefused|enotfound|socket/i.test(errorStr)) {
    return {
      provider,
      operation,
      status: 'network_error',
      errorCategory: 'network_error',
      incorporated: false,
    };
  }

  // 4. Empty Response: Provider returned response without text/description
  if (!errorStr) {
    return {
      provider,
      operation,
      status: 'empty_response',
      httpStatus: 200,
      errorCategory: 'empty_response',
      incorporated: false,
    };
  }

  // 5. Unknown Error
  return {
    provider,
    operation,
    status: 'unknown_error',
    errorCategory: 'unknown_error',
    incorporated: false,
  };
}
