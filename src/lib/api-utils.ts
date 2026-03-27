import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

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

/**
 * Parse JSON body and validate with a Zod schema.
 * Returns validated, typed data or a 400 response with validation errors.
 */
export async function parseAndValidateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  const { data: rawData, error: parseError } = await parseJsonBody(request);
  if (parseError) return { data: null, error: parseError };

  try {
    const data = schema.parse(rawData);
    return { data, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map(e => {
        const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
        return `${path}${e.message}`;
      });
      return {
        data: null,
        error: NextResponse.json(
          { error: messages[0], errors: messages },
          { status: 400 }
        ),
      };
    }
    return {
      data: null,
      error: NextResponse.json(
        { error: "Validation failed" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query/search params with a Zod schema.
 * Returns validated params or a 400 response.
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  try {
    const data = schema.parse(params);
    return { data, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map(e => {
        const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
        return `${path}${e.message}`;
      });
      return {
        data: null,
        error: NextResponse.json(
          { error: messages[0], errors: messages },
          { status: 400 }
        ),
      };
    }
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      ),
    };
  }
}
