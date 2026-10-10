import { auditLogger } from '../audit/logger.js';
/**
 * Audit logging middleware
 * Logs requests without sensitive headers
 */
export function auditLogging(req, res, next) {
    // Log after response is sent
    res.on('finish', () => {
        auditLogger.logRequest({
            method: req.method,
            path: req.path,
            ip: req.ip || req.socket.remoteAddress,
        }, res.statusCode);
    });
    next();
}
//# sourceMappingURL=audit.js.map