export type IssueSeverity = "critical" | "warning" | "info"

export type IssueType =
  | "potential_duplicate"
  | "mixed_case"
  | "leading_trailing_whitespace"
  | "double_spaces"
  | "inconsistent_diacritics"
  | "empty_vs_null"
  | "special_characters"

export interface TextIssue {
  type: IssueType
  severity: IssueSeverity
  field: string
  value: string
  recordId: string | number
  suggestion?: string
  relatedValues?: string[]
}

export interface CaseDistribution {
  allUpper: number
  allLower: number
  titleCase: number
  mixed: number
}

export interface FieldAnalysis {
  fieldName: string
  totalValues: number
  uniqueValues: number
  nullCount: number
  emptyCount: number
  caseDistribution: CaseDistribution
  issues: TextIssue[]
}

export interface EndpointAuditResult {
  endpoint: string
  label: string
  sherlockMapping?: string
  recordCount: number
  fetchTimeMs: number
  fields: FieldAnalysis[]
  summary: {
    totalIssues: number
    criticalCount: number
    warningCount: number
    infoCount: number
    healthScore: number
  }
  error?: string
}

export interface FullAuditReport {
  timestamp: string
  durationMs: number
  endpoints: EndpointAuditResult[]
  globalSummary: {
    totalEndpoints: number
    successfulEndpoints: number
    totalRecords: number
    totalIssues: number
    criticalCount: number
    warningCount: number
    infoCount: number
    overallHealthScore: number
  }
}
