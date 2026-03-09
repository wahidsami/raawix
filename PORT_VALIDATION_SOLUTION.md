# Port Validation Solution

## Problem
When adding new ports to `config.allowedPorts`, the scanner service needed to be restarted for the changes to take effect. This caused confusion when users tried to scan new ports and got "Port X is not allowed" errors, even though the port was already in the config file.

## Solution
Implemented a dynamic port validation system that:

1. **Backend API Endpoint** (`/api/scanner/config`)
   - Returns safe scanner configuration values (allowed ports, limits, etc.)
   - No authentication required (only safe, non-sensitive values)
   - Config is read fresh on each request (no restart needed)

2. **Frontend Integration**
   - Fetches scanner config on component mount
   - Validates port before submitting scan request
   - Shows helpful error messages if port is not allowed
   - Backend still enforces security (double validation)

## Files Changed

### Backend
- `apps/scanner/src/api/scanner-config.ts` (NEW)
  - Exposes `/api/scanner/config` endpoint
  - Returns: `allowedPorts`, `allowLocalhost`, `maxPagesHardLimit`, `maxDepthHardLimit`

- `apps/scanner/src/index.ts`
  - Added `scannerConfigRouter` import and route registration

### Frontend
- `apps/report-ui/src/lib/api.ts`
  - Added `getScannerConfig()` method to `ApiClient` class

- `apps/report-ui/src/pages/EntityDetailPage.tsx`
  - Added `scannerConfig` state
  - Fetches config on mount
  - Validates port in `handleStartScan()` before submission

## Benefits

✅ **No Restart Required**: Config is read fresh on each API request  
✅ **Better UX**: Frontend shows validation errors before submission  
✅ **Security Maintained**: Backend still enforces all validation rules  
✅ **Future-Proof**: Easy to add more config values if needed  

## Usage

The frontend automatically fetches the scanner config when the Entity Detail page loads. When a user tries to start a scan:

1. Frontend validates the port against `scannerConfig.allowedPorts`
2. If invalid, shows error: "Port X is not allowed. Only ports Y, Z are permitted."
3. If valid, submits to backend
4. Backend performs final validation (security layer)

## Testing

1. Start scanner service (restart if already running to load new endpoint)
2. Open Entity Detail page in dashboard
3. Try to scan `http://localhost:4174`
4. Should work without errors (port 4174 is in allowed list)

## Adding New Ports

To add a new port:

1. Update `apps/scanner/src/config.ts`:
   ```typescript
   allowedPorts: [80, 443, 3000, 3001, 4173, 4174, 5173, NEW_PORT]
   ```

2. **No restart needed!** The frontend will automatically fetch the updated config on next page load.

3. Users can immediately scan the new port without restarting the scanner service.

