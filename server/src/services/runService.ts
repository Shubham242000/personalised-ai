import { prisma } from "../db/prisma";

export async function getRunById(userId: string, runId: string) {
  return prisma.agentRun.findFirst({
    where: {
      id: runId,
      userId,
    },
    include: {
      sources: {
        orderBy: { retrievedAt: "asc" },
      },
    },
  });
}
