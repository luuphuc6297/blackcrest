import { prisma } from "@/lib/prisma";

// Blue/green healthcheck (blueprint §5) — 200 only when the DB is reachable.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", time: new Date().toISOString() });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
