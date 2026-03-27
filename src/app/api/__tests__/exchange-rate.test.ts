/**
 * Integration tests for /api/exchange-rate route.
 * Tests currency exchange rate lookup endpoint.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockFetchExchangeRate } = vi.hoisted(() => ({
  mockFetchExchangeRate: vi.fn().mockResolvedValue(1.0),
}));

vi.mock("@/lib/exchange-rate", () => ({
  fetchExchangeRate: mockFetchExchangeRate,
}));

// ── Import handler after mocking ─────────────────────────────────────────

import { GET } from "../exchange-rate/route";

// ── Tests ────────────────────────────────────────────────────────────────

describe("GET /api/exchange-rate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exchange rate for valid currency pair", async () => {
    mockFetchExchangeRate.mockResolvedValueOnce(0.92);

    const request = createRequest("/api/exchange-rate?from=USD&to=EUR");
    const response = await GET(request);
    const { status, data } = await parseResponse<{
      from: string;
      to: string;
      rate: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.from).toBe("USD");
    expect(data.to).toBe("EUR");
    expect(data.rate).toBe(0.92);
    expect(mockFetchExchangeRate).toHaveBeenCalledWith("USD", "EUR");
  });

  it("returns rate of 1 for same currency", async () => {
    const request = createRequest("/api/exchange-rate?from=USD&to=USD");
    const response = await GET(request);
    const { status, data } = await parseResponse<{
      from: string;
      to: string;
      rate: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.rate).toBe(1);
    expect(mockFetchExchangeRate).not.toHaveBeenCalled();
  });

  it("returns rate of 1 for same currency case-insensitive", async () => {
    const request = createRequest("/api/exchange-rate?from=usd&to=USD");
    const response = await GET(request);
    const { status, data } = await parseResponse<{ rate: number }>(response);

    expect(status).toBe(200);
    expect(data.rate).toBe(1);
    expect(mockFetchExchangeRate).not.toHaveBeenCalled();
  });

  it("returns 400 when 'from' is missing", async () => {
    const request = createRequest("/api/exchange-rate?to=EUR");
    const response = await GET(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("returns 400 when 'to' is missing", async () => {
    const request = createRequest("/api/exchange-rate?from=USD");
    const response = await GET(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("returns 400 when both params are missing", async () => {
    const request = createRequest("/api/exchange-rate");
    const response = await GET(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 502 when exchange rate service fails", async () => {
    mockFetchExchangeRate.mockResolvedValueOnce(null);

    const request = createRequest("/api/exchange-rate?from=USD&to=XYZ");
    const response = await GET(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(502);
    expect(data.error).toContain("USD");
    expect(data.error).toContain("XYZ");
  });
});
