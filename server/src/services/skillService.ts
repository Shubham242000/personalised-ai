import { prisma } from "../db/prisma";

export async function upsertSkill(
  userId: string,
  skillName: string,
  rating: number
) {
  return prisma.userSkill.upsert({
    where: {
      userId_skillName: {
        userId,
        skillName,
      },
    },
    update: {
      rating,
    },
    create: {
      userId,
      skillName,
      rating,
    },
  });
}

export async function getUserSkills(userId: string) {
  const skills = await prisma.userSkill.findMany({
    where: { userId }
  });

  return skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.skillName] = skill.rating;
    return acc;
  }, {});
}