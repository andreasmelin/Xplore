export const runtime = "edge";

import { getQuotaStatus } from "@/lib/quota-manager";
import { parseCookies } from "@/lib/auth/cookies";

export async function GET(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const userId = cookies["x_user_id"];
    
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const status = await getQuotaStatus(userId);
    
    return Response.json({ 
      status: {
        remaining: status.remaining,
        limit: status.limit,
        used: status.used,
        resetAt: getNextMidnight(),
      }
    });
  } catch (error) {
    console.error("[Quota] Error fetching status:", error);
    return Response.json({ error: "Failed to fetch quota status" }, { status: 500 });
  }
}

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}










