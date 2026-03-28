"use client";

import { useState, useCallback } from "react";
import type { ReportFilters, SavedReport } from "./types";

export interface ReportFormState {
  name: string;
  description: string;
  format: string;
  type: string;
  accountId: string;
  categoryId: string;
  periodPreset: string;
  scheduleEnabled: boolean;
  scheduleFrequency: string;
  scheduleDay: number | null;
}

export function useReportForm() {
  const [formState, setFormState] = useState<ReportFormState>({
    name: "",
    description: "",
    format: "csv",
    type: "",
    accountId: "",
    categoryId: "",
    periodPreset: "",
    scheduleEnabled: false,
    scheduleFrequency: "weekly",
    scheduleDay: 1,
  });

  const updateField = useCallback(<K extends keyof ReportFormState>(
    field: K,
    value: ReportFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      name: "",
      description: "",
      format: "csv",
      type: "",
      accountId: "",
      categoryId: "",
      periodPreset: "",
      scheduleEnabled: false,
      scheduleFrequency: "weekly",
      scheduleDay: 1,
    });
  }, []);

  const populateForm = useCallback((report: SavedReport) => {
    setFormState({
      name: report.name,
      description: report.description || "",
      format: report.format,
      type: report.filters.type || "",
      accountId: report.filters.accountId || "",
      categoryId: report.filters.categoryId || "",
      periodPreset: report.filters.periodPreset || "",
      scheduleEnabled: report.scheduleEnabled,
      scheduleFrequency: report.scheduleFrequency || "weekly",
      scheduleDay: report.scheduleDay,
    });
  }, []);

  const buildFilters = useCallback((): ReportFilters => {
    const filters: ReportFilters = {};
    if (formState.type) filters.type = formState.type;
    if (formState.accountId) filters.accountId = formState.accountId;
    if (formState.categoryId) filters.categoryId = formState.categoryId;
    if (formState.periodPreset) filters.periodPreset = formState.periodPreset;
    return filters;
  }, [formState.type, formState.accountId, formState.categoryId, formState.periodPreset]);

  const buildPayload = useCallback(() => ({
    name: formState.name.trim(),
    description: formState.description.trim() || undefined,
    format: formState.format,
    filters: buildFilters(),
    scheduleEnabled: formState.scheduleEnabled,
    scheduleFrequency: formState.scheduleEnabled ? formState.scheduleFrequency : undefined,
    scheduleDay: formState.scheduleEnabled ? formState.scheduleDay : undefined,
  }), [formState, buildFilters]);

  return {
    formState,
    updateField,
    resetForm,
    populateForm,
    buildFilters,
    buildPayload,
  };
}
