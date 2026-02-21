// =============================================================================
// ISKOlarship - OCR Document Verification Types
// =============================================================================

export interface OcrFieldResult {
  field: string;
  extracted: string | number | null;
  expected: string | number | null;
  match: boolean;
  similarity?: number;
  difference?: number;
  percentDifference?: string;
  severity: 'verified' | 'warning' | 'critical' | 'unreadable';
}

export interface OcrDocumentResult {
  documentId: string;
  documentType: string;
  documentName: string;
  status: 'completed' | 'failed' | 'skipped' | 'unavailable' | 'processing' | 'pending';
  overallMatch?: 'verified' | 'mismatch' | 'partial' | 'unreadable';
  confidence?: number;
  fields?: OcrFieldResult[];
  extractedFields?: Record<string, unknown>;
  rawTextPreview?: string;
  processedAt?: string;
  error?: string;
  message?: string;
}

export interface OcrApplicationSummary {
  total?: number;
  totalDocuments: number;
  fileDocuments: number;
  verified: number;
  mismatches: number;
  partial: number;
  unreadable: number;
  pending: number;
  failed: number;
  completed?: number;
  skipped?: number;
  unavailable?: number;
  overallStatus: 'all_verified' | 'has_mismatches' | 'incomplete' | 'not_started';
}

export interface OcrVerificationStatus {
  applicationId: string;
  ocrAvailable: boolean;
  summary: OcrApplicationSummary;
  documents: Array<{
    documentId: string;
    name: string;
    type: string;
    isTextDocument: boolean;
    ocrStatus: string;
    overallMatch: string | null;
    confidence: number | null;
    comparisonResults: OcrFieldResult[];
    extractedFields: Record<string, unknown> | null;
    processedAt: string | null;
    error: string | null;
  }>;
}

export interface OcrServiceStatus {
  available: boolean;
  provider: string;
}

export interface OcrRawText {
  documentId: string;
  documentName: string;
  documentType: string;
  rawText: string | null;
  status: string;
  processedAt: string | null;
}
