import { searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return errorResponse("Search query is required.", 400);
  }

  try {
    const results = await searchAll(query);

    return Response.json({ query, results });
  } catch (error) {
    console.error("Failed to search workspace", error);
    return errorResponse(
      "Unable to search workspace. Check database configuration.",
      503,
    );
  }
}
