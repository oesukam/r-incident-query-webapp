#!/bin/bash

set -e

# =========================
# Coverage Report Script
# =========================
# Usage: ./coverage-report.sh [coverage-summary.json] [default-threshold] [output-file]

COVERAGE_FILE="${1:-coverage/coverage-summary.json}"
DEFAULT_THRESHOLD="${2:-70}"
OUTPUT_FILE="${3:-}"

# Auto-detect PR commenting context
SHOULD_COMMENT_PR="${COMMENT_PR:-auto}"
if [ "$SHOULD_COMMENT_PR" = "auto" ]; then
    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_EVENT_PATH" ] && [ -f "$GITHUB_EVENT_PATH" ]; then
        EVENT_NAME=$(node -e "console.log(require('$GITHUB_EVENT_PATH').pull_request ? 'pull_request' : 'other')" 2>/dev/null || echo "other")
        SHOULD_COMMENT_PR=$([ "$EVENT_NAME" = "pull_request" ] && echo "true" || echo "false")
    else
        SHOULD_COMMENT_PR="false"
    fi
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check coverage file
if [ ! -f "$COVERAGE_FILE" ]; then
    echo -e "${RED}Error: Coverage file not found at $COVERAGE_FILE${NC}"
    ls -1 coverage || true
    exit 1
fi

# Extract NYC thresholds from package.json if available
get_nyc_threshold() {
    local metric=$1
    if [ -f "package.json" ]; then
        node -e "
            try {
                const pkg = require('./package.json');
                console.log(pkg.nyc?.$metric || '');
            } catch(e) { console.log(''); }
        " 2>/dev/null || echo ""
    else
        echo ""
    fi
}

NYC_LINES=$(get_nyc_threshold "lines")
NYC_FUNCTIONS=$(get_nyc_threshold "functions")
NYC_BRANCHES=$(get_nyc_threshold "branches")
NYC_STATEMENTS=$(get_nyc_threshold "statements")

# Output optional GitHub Action outputs
if [ -n "$OUTPUT_FILE" ]; then
    echo "coverage<<EOF" >> "$OUTPUT_FILE"
    cat "$COVERAGE_FILE" >> "$OUTPUT_FILE"
    echo "EOF" >> "$OUTPUT_FILE"
    echo "jest_lines=$NYC_LINES" >> "$OUTPUT_FILE"
    echo "jest_functions=$NYC_FUNCTIONS" >> "$OUTPUT_FILE"
    echo "jest_branches=$NYC_BRANCHES" >> "$OUTPUT_FILE"
    echo "jest_statements=$NYC_STATEMENTS" >> "$OUTPUT_FILE"
fi

# Thresholds (fallback to default if not defined)
LINES_THRESHOLD="${NYC_LINES:-$DEFAULT_THRESHOLD}"
FUNCTIONS_THRESHOLD="${NYC_FUNCTIONS:-$DEFAULT_THRESHOLD}"
BRANCHES_THRESHOLD="${NYC_BRANCHES:-$DEFAULT_THRESHOLD}"
STATEMENTS_THRESHOLD="${NYC_STATEMENTS:-$DEFAULT_THRESHOLD}"

# Extract metrics from coverage JSON
get_coverage_metric() {
    local metric=$1
    node -e "
        const coverage = require('./$COVERAGE_FILE');
        console.log(coverage.total?.$metric?.pct ?? 0);
    "
}

LINES_PCT=$(get_coverage_metric "lines")
FUNCTIONS_PCT=$(get_coverage_metric "functions")
BRANCHES_PCT=$(get_coverage_metric "branches")
STATEMENTS_PCT=$(get_coverage_metric "statements")

# Terminal style (colored + emoji)
check_metric() {
  local value=$1
  local threshold=$2
  local result
  result=$(echo "$value >= $threshold" | bc -l 2>/dev/null || echo 0)
  if [ "$result" -eq 1 ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
  else
    echo -e "${RED}❌ FAILED${NC}"
  fi
}

# PR comment style (Markdown-friendly, no ANSI)
check_metric_md() {
  local value=$1
  local threshold=$2
  local result
  result=$(echo "$value >= $threshold" | bc -l 2>/dev/null || echo 0)
  if [ "$result" -eq 1 ]; then
    echo "✅ **Passed**"
  else
    echo "❌ **Failed**"
  fi
}

FAILED_METRICS=()
EXIT_CODE=0

# Print report
echo ""
echo "=========================================="
echo "📊 Test Coverage Report"
echo "=========================================="
echo ""
printf "%-15s %-12s %-12s %-8s\n" "Metric" "Coverage" "Threshold" "Status"
echo "------------------------------------------"

# Reusable metric check
check_and_record() {
  local name=$1
  local pct=$2
  local threshold=$3

  local status
  status=$(check_metric "$pct" "$threshold")

  printf "%-15s %-12s %-12s %b\n" "$name" "${pct}%" "${threshold}%" "$status"

  local result
  result=$(echo "$pct < $threshold" | bc -l 2>/dev/null || echo 0)
  if [ "$result" -eq 1 ]; then
      FAILED_METRICS+=("${name}: ${pct}% < ${threshold}%")
      EXIT_CODE=1
  fi
}

# Perform checks
check_and_record "Lines" "$LINES_PCT" "$LINES_THRESHOLD"
check_and_record "Functions" "$FUNCTIONS_PCT" "$FUNCTIONS_THRESHOLD"
check_and_record "Branches" "$BRANCHES_PCT" "$BRANCHES_THRESHOLD"
check_and_record "Statements" "$STATEMENTS_PCT" "$STATEMENTS_THRESHOLD"

echo "------------------------------------------"
echo ""

# Print failed metrics if any
if [ ${#FAILED_METRICS[@]} -gt 0 ]; then
    echo -e "${RED}❗️ Failed Metrics:${NC}"
    for metric in "${FAILED_METRICS[@]}"; do
        echo -e "  ${RED}- $metric${NC}"
    done
    echo ""
fi

# Test coverage
if [ "$(echo "$STATEMENTS_PCT >= $STATEMENTS_THRESHOLD" | bc -l)" -eq 1 ]; then
    echo -e "${GREEN}Test Coverage: ${STATEMENTS_PCT}% (Threshold: ${STATEMENTS_THRESHOLD}%) ✅ PASSED${NC}"
else
    echo -e "${RED}Test Coverage: ${STATEMENTS_PCT}% (Threshold: ${STATEMENTS_THRESHOLD}%) ❌ FAILED${NC}"
    EXIT_CODE=1
fi

echo "=========================================="
echo ""

# =========================
# GitHub Summary Output
# =========================
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat >> "$GITHUB_STEP_SUMMARY" << EOF
## 📊 Test Coverage Report

| Metric | Coverage | Threshold | Status |
|--------|-----------|-----------|--------|
| Lines | ${LINES_PCT}% | ${LINES_THRESHOLD}% | $(check_metric_md "$LINES_PCT" "$LINES_THRESHOLD") |
| Functions | ${FUNCTIONS_PCT}% | ${FUNCTIONS_THRESHOLD}% | $(check_metric_md "$FUNCTIONS_PCT" "$FUNCTIONS_THRESHOLD") |
| Branches | ${BRANCHES_PCT}% | ${BRANCHES_THRESHOLD}% | $(check_metric_md "$BRANCHES_PCT" "$BRANCHES_THRESHOLD") |
| Statements | ${STATEMENTS_PCT}% | ${STATEMENTS_THRESHOLD}% | $(check_metric_md "$STATEMENTS_PCT" "$STATEMENTS_THRESHOLD") |

EOF

    if [ ${#FAILED_METRICS[@]} -gt 0 ]; then
        echo "### ❗️ Failed Metrics" >> "$GITHUB_STEP_SUMMARY"
        for metric in "${FAILED_METRICS[@]}"; do
            echo "- $metric" >> "$GITHUB_STEP_SUMMARY"
        done
        echo "" >> "$GITHUB_STEP_SUMMARY"
    fi
    
    if [ "$(echo "$STATEMENTS_PCT >= $STATEMENTS_THRESHOLD" | bc -l)" -eq 1 ]; then
        echo "**Test Coverage: ${STATEMENTS_PCT}% (Threshold: ${STATEMENTS_THRESHOLD}%) ✅ PASSED**" >> "$GITHUB_STEP_SUMMARY"
    else
        echo "**Test Coverage: ${STATEMENTS_PCT}% (Threshold: ${STATEMENTS_THRESHOLD}%) ❌ FAILED**" >> "$GITHUB_STEP_SUMMARY"
    fi
fi

# =========================
# Optional PR Comment
# =========================
if [ "$SHOULD_COMMENT_PR" = "true" ]; then
    echo ""
    echo "Posting coverage report to PR..."

    FAILED_METRICS_MD=""
    if [ ${#FAILED_METRICS[@]} -gt 0 ]; then
        FAILED_METRICS_MD="### ❗️ Failed Metrics\n"
        for metric in "${FAILED_METRICS[@]}"; do
            FAILED_METRICS_MD="${FAILED_METRICS_MD}- $metric\n"
        done
        FAILED_METRICS_MD="${FAILED_METRICS_MD}\n"
    fi

    TEST_STATUS=$([ "$(echo "$STATEMENTS_PCT >= $STATEMENTS_THRESHOLD" | bc -l)" -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")

    PR_COMMENT=$(cat << EOF
## 📊 Test Coverage Report

| Metric | Coverage | Threshold | Status |
|--------|-----------|-----------|--------|
| Lines | ${LINES_PCT}% | ${LINES_THRESHOLD}% | $(check_metric_md "$LINES_PCT" "$LINES_THRESHOLD") |
| Functions | ${FUNCTIONS_PCT}% | ${FUNCTIONS_THRESHOLD}% | $(check_metric_md "$FUNCTIONS_PCT" "$FUNCTIONS_THRESHOLD") |
| Branches | ${BRANCHES_PCT}% | ${BRANCHES_THRESHOLD}% | $(check_metric_md "$BRANCHES_PCT" "$BRANCHES_THRESHOLD") |
| Statements | ${STATEMENTS_PCT}% | ${STATEMENTS_THRESHOLD}% | $(check_metric_md "$STATEMENTS_PCT" "$STATEMENTS_THRESHOLD") |

$(echo -e "$FAILED_METRICS_MD")**Test Coverage: ${STATEMENTS_PCT}% (Threshold: ${STATEMENTS_THRESHOLD}%) ${TEST_STATUS}**
EOF
)

    PR_NUMBER=$(node -e "console.log(require('$GITHUB_EVENT_PATH').pull_request.number)" 2>/dev/null || echo "")
    if [ -n "$PR_NUMBER" ]; then
        REPO_OWNER=$(echo "$GITHUB_REPOSITORY" | cut -d'/' -f1)
        REPO_NAME=$(echo "$GITHUB_REPOSITORY" | cut -d'/' -f2)
        RESPONSE=$(curl -s -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues/$PR_NUMBER/comments" \
            -d "$(jq -n --arg body "$PR_COMMENT" '{body: $body}')")
        if echo "$RESPONSE" | jq -e '.id' >/dev/null 2>&1; then
            echo "✅ Successfully posted coverage report to PR #$PR_NUMBER"
        else
            echo "⚠️  Failed to post comment to PR:"
            echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        fi
    else
        echo "⚠️  Could not determine PR number. Skipping comment."
    fi
fi

exit $EXIT_CODE
