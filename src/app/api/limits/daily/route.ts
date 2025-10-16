import { parseCookies } from "@/lib/auth/cookies";
import { getDailyStatus } from "@/lib/rate-limit";

const ACTION = "chat_request";
const DAILY_LIMIT = 50;

export async function GET(req: Request) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const userId = cookies["x_user_id"];
  if (!userId) return Response.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const status = await getDailyStatus(userId, DAILY_LIMIT, ACTION);
    return Response.json({ status });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}


