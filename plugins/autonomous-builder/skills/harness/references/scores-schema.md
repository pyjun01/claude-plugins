# scores.json Schema

harness.js parses these exact field names. Do NOT rename or omit any field.

```json
{
  "round": 1,
  "timestamp": "2026-03-26T16:45:00Z",
  "scores": {
    "product_depth": 7,
    "functionality": 5,
    "visual_design": 8,
    "code_quality": 7
  },
  "allPassed": false,
  "summary": "One-line summary of evaluation results"
}
```

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `round` | int | Current round number (from prompt) |
| `timestamp` | string | ISO-8601 timestamp of evaluation |
| `scores.product_depth` | int (1-10) | Real logic vs shallow stubs |
| `scores.functionality` | int (1-10) | Core workflows work when clicked through |
| `scores.visual_design` | int (1-10) | Coherent identity vs generic AI patterns |
| `scores.code_quality` | int (1-10) | Clean architecture, no obvious bugs |
| `allPassed` | boolean | true if ALL scores >= threshold (7 by default) |
| `summary` | string | One-line description of findings |
