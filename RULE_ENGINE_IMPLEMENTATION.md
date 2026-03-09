# Rule Engine Implementation

## ✅ Completed Features

### 1. Shared Types (packages/core)

Added new types to `packages/core/src/index.ts`:

- **`EvidenceItem`**: Represents evidence for rule violations
  - `type`: 'element' | 'screenshot' | 'html' | 'text' | 'url'
  - `value`: string
  - `selector?`: string
  - `description?`: string

- **`RuleResult`**: Result of evaluating a rule on a page
  - `ruleId`: string
  - `wcagId?`: string
  - `status`: 'pass' | 'fail' | 'needs_review' | 'na'
  - `confidence`: 'high' | 'medium' | 'low'
  - `evidence`: EvidenceItem[]
  - `howToVerify`: string
  - `message?`: string

- **`PageArtifact`**: Represents a captured page with all artifacts
  - `pageNumber`: number
  - `url`: string
  - `title?`: string
  - `finalUrl?`: string
  - `htmlPath?`: string
  - `screenshotPath?`: string
  - `a11yPath?`: string
  - `metadataPath?`: string
  - `html?`: string (loaded content)
  - `a11y?`: unknown (accessibility snapshot)
  - `error?`: string

- **`ScanRun`**: Complete scan run with all results
  - `scanId`: string
  - `seedUrl`: string
  - `startedAt`: string
  - `completedAt?`: string
  - `pages`: PageArtifact[]
  - `results`: PageRuleResults[]
  - `summary`: ScanRunSummary

- **`PageRuleResults`**: Rule results for a single page
  - `pageNumber`: number
  - `url`: string
  - `ruleResults`: RuleResult[]

- **`ScanRunSummary`**: Summary statistics
  - `totalPages`: number
  - `totalRules`: number
  - `byLevel`: { A: LevelSummary, AA: LevelSummary }
  - `byStatus`: { pass, fail, needs_review, na }

- **`LevelSummary`**: Summary for a WCAG level
  - `pass`: number
  - `fail`: number
  - `needs_review`: number
  - `na`: number
  - `total`: number

### 2. Rule Engine (packages/rules)

#### Rule Interface (`packages/rules/src/rule-engine.ts`)

```typescript
interface Rule {
  id: string;
  wcagId?: string;
  level?: 'A' | 'AA' | 'AAA';
  title: string;
  description: string;
  evaluate: (page: PageArtifact) => Promise<RuleResult> | RuleResult;
}
```

#### RuleEngine Class

- `registerRule(rule: Rule)`: Register a single rule
- `registerRules(rules: Rule[])`: Register multiple rules
- `evaluatePage(page: PageArtifact, ruleIds?: string[])`: Evaluate all rules (or specified rules) on a page
- `getRule(id: string)`: Get a rule by ID
- `getAllRules()`: Get all registered rules
- `getRulesByLevel(level: WCAGLevel)`: Get rules for a specific WCAG level

#### Implemented WCAG Rules (`packages/rules/src/wcag-rules.ts`)

1. **wcag-1.1.1** (Level A): Images must have alt text
2. **wcag-2.4.2** (Level A): Page must have a title
3. **wcag-4.1.2** (Level AA): Form inputs must have labels
4. **wcag-1.3.1-headings** (Level A): Headings must be in logical order
5. **wcag-4.1.2-links** (Level A): Links must have discernible text

### 3. Report Generator (apps/scanner/src/runner/report-generator.ts)

#### ReportGenerator Class

- **`loadPageArtifacts(scanId: string)`**: Loads all page artifacts from `output/{scanId}/pages/`
  - Reads `page.json` metadata files
  - Loads HTML content if available
  - Loads accessibility snapshots if available
  - Returns sorted array of `PageArtifact`

- **`generateReport(scanId, seedUrl, startedAt, completedAt?)`**: 
  - Loads all page artifacts
  - Initializes rule engine with all WCAG rules
  - Runs all rules on each page
  - Generates summary statistics
  - Returns complete `ScanRun` object

- **`saveReport(scanId, report)`**: 
  - Saves `report.json` to `output/{scanId}/report.json`
  - This is the canonical truth source

- **`generateSummary(pageResults, totalRules)`**:
  - Counts results by WCAG level (A/AA)
  - Counts results by status (pass/fail/needs_review/na)
  - Returns `ScanRunSummary`

### 4. Integration

The report generator is integrated into the job queue:
- After a scan completes, `ReportGenerator.generateReport()` is called
- The canonical `report.json` is saved to `output/{scanId}/report.json`
- Summary includes counts by WCAG level (A/AA) and status

## File Structure

```
packages/
├── core/
│   └── src/
│       └── index.ts          # Shared types (ScanRun, PageArtifact, RuleResult, etc.)
└── rules/
    └── src/
        ├── index.ts          # Exports (backward compatible)
        ├── rule-engine.ts    # RuleEngine class and Rule interface
        └── wcag-rules.ts     # Implemented WCAG rules

apps/scanner/src/
└── runner/
    └── report-generator.ts   # ReportGenerator class
```

## Usage

### Running Rules on a Scan

The report generator automatically runs after each scan completes. The canonical report is saved to:

```
output/{scanId}/report.json
```

### Report Structure

```json
{
  "scanId": "scan_1234567890_abc123",
  "seedUrl": "https://example.com",
  "startedAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:00:10.000Z",
  "pages": [...],
  "results": [
    {
      "pageNumber": 1,
      "url": "https://example.com",
      "ruleResults": [
        {
          "ruleId": "wcag-1.1.1",
          "wcagId": "1.1.1",
          "status": "fail",
          "confidence": "high",
          "evidence": [...],
          "howToVerify": "Add alt attributes to all images..."
        }
      ]
    }
  ],
  "summary": {
    "totalPages": 5,
    "totalRules": 5,
    "byLevel": {
      "A": {
        "pass": 10,
        "fail": 5,
        "needs_review": 0,
        "na": 0,
        "total": 15
      },
      "AA": {
        "pass": 8,
        "fail": 2,
        "needs_review": 0,
        "na": 0,
        "total": 10
      }
    },
    "byStatus": {
      "pass": 18,
      "fail": 7,
      "needs_review": 0,
      "na": 0
    }
  }
}
```

## Adding New Rules

To add a new WCAG rule:

1. Create a rule object in `packages/rules/src/wcag-rules.ts`:

```typescript
export const myNewRule: Rule = {
  id: 'wcag-X.X.X',
  wcagId: 'X.X.X',
  level: 'A',
  title: 'My Rule Title',
  description: 'Rule description',
  evaluate: (page: PageArtifact): RuleResult => {
    // Rule evaluation logic
    return {
      ruleId: 'wcag-X.X.X',
      wcagId: 'X.X.X',
      status: 'pass', // or 'fail', 'needs_review', 'na'
      confidence: 'high',
      evidence: [],
      howToVerify: 'How to manually verify this rule',
    };
  },
};
```

2. Add it to `allWcagRules` array
3. The rule will automatically be included in all scans

## Summary Statistics

The report includes comprehensive summary statistics:

- **By WCAG Level** (A/AA):
  - Count of pass/fail/needs_review/na for each level
  - Total rules per level

- **By Status** (across all levels):
  - Total pass
  - Total fail
  - Total needs_review
  - Total na

This allows for easy compliance reporting and tracking progress toward WCAG A/AA conformance.

