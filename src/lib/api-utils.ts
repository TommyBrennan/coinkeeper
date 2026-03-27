import { NextRequest, NextResponse } from "next/server";

/**
 * Safely parse JSON body from a request.
 * Returns { data, error } — if the body is malformed JSON, returns a 400 response.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseJsonBody<T = any>(
  request: NextRequest
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const data = await request.json();
    return { data: data as T, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      ),
    };
  }
}
