export interface Account {
  id: string;
  name: string;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ReportFilters {
  type?: string;
  accountId?: string;
  categoryId?: string;
  periodPreset?: string;
  from?: string;
  to?: string;
}

export interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  format: string;
  filters: ReportFilters;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  scheduleEnabled: boolean;
  scheduleFrequency: string | null;
  scheduleDay: number | null;
  scheduleTime: string | null;
  nextRunAt: string | null;
  lastGeneratedAt: string | null;
  generatedCount: number;
}

export interface GeneratedReport {
  id: string;
  format: string;
  fileName: string | null;
  summary: {
    totalTransactions: number;
    totalExpenses: number;
    totalIncome: number;
    totalTransfers: number;
    netAmount: number;
  } | null;
  generatedAt: string;
  expiresAt: string | null;
}

export interface JsonReportResult {
  report: { name: string; generatedAt: string };
  summary: {
    totalTransactions: number;
    totalExpenses: number;
    totalIncome: number;
    totalTransfers: number;
    netAmount: number;
  };
  transactions: Array<Record<string, unknown>>;
}

export const PERIOD_PRESETS = [
  { value: "", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

export const TRANSACTION_TYPES = [
  { value: "", label: "All types" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfers" },
];
