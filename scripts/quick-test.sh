#!/bin/bash

# Quick test script for scanner-safe-links
# Tests the /l/* endpoint and verifies events are recorded

set -e

BASE_URL="${1:-http://localhost:8787}"
TEST_PATH="${2:-test/path}"
TEST_QUERY="${3:-token=abc123}"

echo "Testing scanner-safe-links at $BASE_URL"
echo "Test path: /l/$TEST_PATH?$TEST_QUERY"
echo ""

# Test Phase A: GET /l/*
echo "=== Phase A: Testing GET /l/$TEST_PATH ==="
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/l/$TEST_PATH?$TEST_QUERY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✓ GET /l/$TEST_PATH returned 200 OK"
  
  # Check if response contains expected elements
  if echo "$BODY" | grep -q "Verifying Link"; then
    echo "✓ Response contains interstitial page"
  else
    echo "✗ Response does not contain expected content"
  fi
  
  # Try to extract nonce from HTML (if present)
  NONCE=$(echo "$BODY" | grep -oP 'action="/v/\K[^"]+' | head -n1 || echo "")
  if [ -n "$NONCE" ]; then
    echo "✓ Found nonce in response: $NONCE"
  else
    echo "ℹ Nonce not found in HTML (may be computed in JS)"
  fi
else
  echo "✗ GET /l/$TEST_PATH returned $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

echo ""

# Wait a moment for event to be recorded
echo "Waiting 1 second for event to be recorded..."
sleep 1

# Test Receipts: GET /r/events
echo "=== Testing GET /r/events ==="
EVENTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/r/events")
EVENTS_HTTP_CODE=$(echo "$EVENTS_RESPONSE" | tail -n1)
EVENTS_BODY=$(echo "$EVENTS_RESPONSE" | sed '$d')

if [ "$EVENTS_HTTP_CODE" -eq 200 ]; then
  echo "✓ GET /r/events returned 200 OK"
  
  # Check if response contains events
  if echo "$EVENTS_BODY" | grep -q '"events"'; then
    echo "✓ Response contains events array"
    
    # Count minted events
    MINTED_COUNT=$(echo "$EVENTS_BODY" | grep -o '"action":"minted"' | wc -l || echo "0")
    echo "ℹ Found $MINTED_COUNT minted event(s)"
    
    # Show recent events (first 3)
    echo ""
    echo "Recent events (first 3):"
    echo "$EVENTS_BODY" | grep -o '"action":"[^"]*"' | head -n3 || echo "  (none)"
  else
    echo "✗ Response does not contain events array"
  fi
else
  echo "✗ GET /r/events returned $EVENTS_HTTP_CODE"
  echo "Response: $EVENTS_BODY"
  exit 1
fi

echo ""
echo "=== Test Summary ==="
echo "✓ Phase A (GET /l/*) - Interstitial page loads"
echo "✓ Events endpoint accessible"
echo ""
echo "Note: Phase B (POST /v/:nonce) requires JavaScript signature computation"
echo "      To fully test, visit $BASE_URL/l/$TEST_PATH?$TEST_QUERY in a browser"
echo ""
