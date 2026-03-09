#!/bin/bash
# MVP Proof Run - End-to-End Test Script
# This script verifies the complete MVP functionality

set -e

API_URL="http://localhost:3001"
API_KEY="dev-api-key-change-in-production"
TEST_URL="https://example.com"

echo "=== MVP Proof Run - End-to-End Test ==="
echo ""

# Step 1: Start scan
echo "Step 1: Initiating scan..."
SCAN_RESPONSE=$(curl -s -X POST "$API_URL/api/scan" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"seedUrl\":\"$TEST_URL\",\"maxPages\":5,\"maxDepth\":2}")

SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.scanId')
echo "Scan ID: $SCAN_ID"
echo "Response: $SCAN_RESPONSE"
echo ""

# Step 2: Wait for scan to complete
echo "Step 2: Waiting for scan to complete..."
STATUS="running"
ATTEMPTS=0
MAX_ATTEMPTS=60  # 5 minutes max

while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  sleep 5
  ATTEMPTS=$((ATTEMPTS + 1))
  
  STATUS_RESPONSE=$(curl -s "$API_URL/api/scan/$SCAN_ID" \
    -H "X-API-Key: $API_KEY")
  
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  echo "  Attempt $ATTEMPTS: Status = $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Scan completed!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Scan failed!"
    echo $STATUS_RESPONSE | jq '.'
    exit 1
  fi
done

if [ "$STATUS" != "completed" ]; then
  echo "❌ Scan did not complete within timeout"
  exit 1
fi

echo ""

# Step 3: Verify artifacts
echo "Step 3: Verifying artifacts..."
if [ -d "output/$SCAN_ID/pages" ]; then
  PAGE_COUNT=$(ls -d output/$SCAN_ID/pages/*/ 2>/dev/null | wc -l)
  echo "✅ Pages directory exists with $PAGE_COUNT pages"
  
  # Check first page artifacts
  if [ -f "output/$SCAN_ID/pages/1/page.json" ]; then
    echo "✅ page.json exists"
  fi
  if [ -f "output/$SCAN_ID/pages/1/page.html" ]; then
    echo "✅ page.html exists"
  fi
  if [ -f "output/$SCAN_ID/pages/1/screenshot.png" ]; then
    echo "✅ screenshot.png exists"
  fi
  if [ -f "output/$SCAN_ID/pages/1/a11y.json" ]; then
    echo "✅ a11y.json exists"
  fi
else
  echo "❌ Pages directory not found"
  exit 1
fi
echo ""

# Step 4: Verify report.json
echo "Step 4: Verifying report.json..."
if [ -f "output/$SCAN_ID/report.json" ]; then
  echo "✅ report.json exists"
  
  # Check structure
  TOTAL_PAGES=$(jq -r '.summary.totalPages' output/$SCAN_ID/report.json)
  TOTAL_RULES=$(jq -r '.summary.totalRules' output/$SCAN_ID/report.json)
  echo "  Total Pages: $TOTAL_PAGES"
  echo "  Total Rules: $TOTAL_RULES"
  
  if [ "$TOTAL_PAGES" -gt 0 ] && [ "$TOTAL_RULES" -gt 0 ]; then
    echo "✅ Report structure valid"
  else
    echo "❌ Report structure invalid"
    exit 1
  fi
else
  echo "❌ report.json not found"
  exit 1
fi
echo ""

# Step 5: Test widget guidance endpoint
echo "Step 5: Testing widget guidance endpoint..."
GUIDANCE_RESPONSE=$(curl -s "$API_URL/api/widget/guidance?url=$TEST_URL&scanId=$SCAN_ID")
if echo "$GUIDANCE_RESPONSE" | jq -e '.landmarks' > /dev/null 2>&1; then
  LANDMARKS_COUNT=$(echo $GUIDANCE_RESPONSE | jq '.landmarks | length')
  FORMS_COUNT=$(echo $GUIDANCE_RESPONSE | jq '.formSteps | length')
  ACTIONS_COUNT=$(echo $GUIDANCE_RESPONSE | jq '.keyActions | length')
  echo "✅ Guidance endpoint works"
  echo "  Landmarks: $LANDMARKS_COUNT"
  echo "  Forms: $FORMS_COUNT"
  echo "  Key Actions: $ACTIONS_COUNT"
else
  echo "❌ Guidance endpoint failed or returned invalid response"
  echo "$GUIDANCE_RESPONSE"
  exit 1
fi
echo ""

# Step 6: Test widget issues endpoint
echo "Step 6: Testing widget issues endpoint..."
ISSUES_RESPONSE=$(curl -s "$API_URL/api/widget/issues?url=$TEST_URL&scanId=$SCAN_ID")
if echo "$ISSUES_RESPONSE" | jq -e '.issues' > /dev/null 2>&1; then
  ISSUES_COUNT=$(echo $ISSUES_RESPONSE | jq '.issues | length')
  echo "✅ Issues endpoint works"
  echo "  Issues found: $ISSUES_COUNT"
  
  if [ "$ISSUES_COUNT" -gt 0 ]; then
    echo "  First issue:"
    echo $ISSUES_RESPONSE | jq '.issues[0] | {severity, title, userImpact}'
  fi
else
  echo "❌ Issues endpoint failed or returned invalid response"
  echo "$ISSUES_RESPONSE"
  exit 1
fi
echo ""

# Step 7: Verify Cache-Control headers
echo "Step 7: Verifying Cache-Control headers..."
HEADERS=$(curl -s -I "$API_URL/api/scan/$SCAN_ID/artifact/pages/1/screenshot.png" \
  -H "X-API-Key: $API_KEY")

if echo "$HEADERS" | grep -q "Cache-Control: no-store"; then
  echo "✅ Cache-Control: no-store header present"
else
  echo "❌ Cache-Control header missing or incorrect"
  echo "$HEADERS"
  exit 1
fi
echo ""

# Step 8: Test widget config endpoint
echo "Step 8: Testing widget config endpoint..."
CONFIG_RESPONSE=$(curl -s "$API_URL/api/widget/config?scanId=$SCAN_ID&lang=en")
if echo "$CONFIG_RESPONSE" | jq -e '.featureFlags' > /dev/null 2>&1; then
  echo "✅ Config endpoint works"
  echo $CONFIG_RESPONSE | jq '{scanId, language, featureFlags}'
else
  echo "❌ Config endpoint failed"
  exit 1
fi
echo ""

echo "=== MVP Proof Run Complete ==="
echo "✅ All tests passed!"
echo "Scan ID: $SCAN_ID"
echo "Report: output/$SCAN_ID/report.json"

