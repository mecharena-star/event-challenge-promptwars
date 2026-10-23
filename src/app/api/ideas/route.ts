import { getDeps } from "@/server/deps";
import { createIdeasHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return createIdeasHandler(getDeps())(request);
}
