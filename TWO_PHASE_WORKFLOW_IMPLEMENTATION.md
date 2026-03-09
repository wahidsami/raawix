# Two-Phase Workflow Implementation Guide

## ✅ Completed Backend Changes

1. **ScanRequest Interface** (`packages/core/src/index.ts`)
   - Added `discoveryOnly?: boolean`
   - Added `selectedUrls?: string[]`

2. **PageDiscovery Class** (`apps/scanner/src/crawler/page-discovery.ts`)
   - New class for fast link extraction (discovery only, no page capture)
   - Emits `crawl_discovered` events

3. **Discovery API Endpoint** (`apps/scanner/src/index.ts`)
   - Added `POST /api/scans/:scanId/discover`
   - Starts discovery in background

4. **Job Queue Updates** (`apps/scanner/src/job-queue.ts`)
   - Handles `selectedUrls` array
   - Sequential scanning mode (one page at a time)

## 🔄 Remaining UI Changes Needed

### 1. Auto-start Discovery on Modal Open

Add to `useEffect` in `ScanMonitorModal.tsx`:

```typescript
// Auto-start discovery when modal opens
useEffect(() => {
  if (phase === 'discovery') {
    const startDiscovery = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('raawix_token');
        
        const response = await fetch(`${apiUrl}/api/scans/${scanId}/discover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            seedUrl,
            maxPages: 50,
            maxDepth: 3,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to start discovery');
        }
        
        setIsScanning(true);
        addDebugLog('info', 'Discovery started');
      } catch (error) {
        addDebugLog('error', `Failed to start discovery: ${error}`);
      }
    };
    
    startDiscovery();
  }
}, [phase, scanId, seedUrl]);
```

### 2. Update Right Panel for Selection Phase

Find the right panel section (around line 947) and add:

```typescript
{/* Right: Status (40%) */}
<div className="w-[40%] p-4 overflow-y-auto">
  {phase === 'selection' ? (
    <>
      <h3 className="font-semibold mb-4 text-gray-900">
        {t('scanMonitor.selectPages') || 'Select Pages to Scan'}
      </h3>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-gray-700 mb-2">
          {t('scanMonitor.selectionInstructions') || 
           'Select the pages you want to scan. Click "Start Scanning" when ready.'}
        </p>
        <p className="text-xs text-gray-600">
          {selectedUrls.size} of {stats.pagesDiscovered} pages selected
        </p>
      </div>
      <button
        onClick={handleStartScanning}
        disabled={selectedUrls.size === 0}
        className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {t('scanMonitor.startScanning') || `Start Scanning (${selectedUrls.size} pages)`}
      </button>
    </>
  ) : (
    <>
      <h3 className="font-semibold mb-4 text-gray-900">{t('scanMonitor.nowScanning')}</h3>
      {/* Existing scanning UI */}
    </>
  )}
</div>
```

### 3. Update Footer Buttons

Find footer section and update:

```typescript
{/* Footer */}
<div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
  {phase === 'selection' && (
    <button
      onClick={handleStartScanning}
      disabled={selectedUrls.size === 0}
      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-gray-300"
    >
      {t('scanMonitor.startScanning') || `Start Scanning (${selectedUrls.size})`}
    </button>
  )}
  {phase === 'scanning' && isScanning && (
    <button
      onClick={handleStopScan}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      {t('scanMonitor.stopScan')}
    </button>
  )}
  {!isScanning && phase === 'scanning' && (
    <button
      onClick={handleSaveFindings}
      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
    >
      {t('scanMonitor.saveFindings')}
    </button>
  )}
  <button
    onClick={onClose}
    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
  >
    {t('common.close') || 'Close'}
  </button>
</div>
```

### 4. Fix handleScanDone Reference

In `handleScanDone`, change `newTree` to use the state:

```typescript
if (phase === 'discovery') {
  setPhase('selection');
  setIsScanning(false);
  setCurrentStep('');
  // Mark all discovered pages as selected by default
  setTree((prev) => {
    const newTree = new globalThis.Map(prev);
    const newSelected = new Set<string>();
    for (const [url, node] of newTree.entries()) {
      node.selected = true;
      newSelected.add(url);
      newTree.set(url, node);
    }
    setSelectedUrls(newSelected);
    return newTree;
  });
  addDebugLog('success', `Discovery complete. ${tree.size} pages found. Please select pages to scan.`);
  return;
}
```

### 5. Add Translation Keys

Add to `apps/report-ui/src/i18n/locales/en.json` and `ar.json`:

```json
{
  "scanMonitor": {
    "discovering": "Discovering Pages...",
    "selectPages": "Select Pages to Scan",
    "selected": "selected",
    "selectAll": "Select All",
    "deselectAll": "Deselect All",
    "noPagesSelected": "Please select at least one page to scan.",
    "startScanning": "Start Scanning",
    "startScanError": "Failed to start scan. Please try again.",
    "selectionInstructions": "Select the pages you want to scan. Click 'Start Scanning' when ready.",
    "discoveringPages": "Discovering pages..."
  }
}
```

## 🎯 Workflow Summary

1. **Modal Opens** → Auto-starts discovery phase
2. **Discovery Phase** → Quick crawl, emits `crawl_discovered` events
3. **Discovery Complete** → Transitions to selection phase
4. **Selection Phase** → User selects pages (checkboxes), clicks "Start Scanning"
5. **Scanning Phase** → Sequential scanning of selected pages (one at a time)
6. **Scanning Complete** → Shows "Save Findings" button

## 🐛 Known Issues to Fix

1. `handleScanDone` references `newTree.size` but should use `tree.size` from state
2. Need to ensure discovery API endpoint works correctly
3. Need to test sequential scanning with `selectedUrls`

