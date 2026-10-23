import { getDeps } from "@/server/deps";
import { createPlanHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return createPlanHandler(getDeps())(request);
}
