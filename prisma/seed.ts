import crypto from "crypto";
import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRANCH_COUNT = 10;

function getBranchHandle(branchName: string) {
  return branchName.replace(/[^a-zA-Z0-9]/g, "-");
}

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seeding is not allowed in production.");
    process.exit(1);
  }

  const repo = await prisma.repository.create({
    data: {
      id: crypto.randomUUID(),
      owner: "iFixit",
      name: "ifixit",
      fullName: "iFixit/ifixit",
      dockerComposeDirectory: "./apps/strapi",
    },
  });

  const usedNames = new Set<string>();
  for (let i = 0; i < BRANCH_COUNT; i++) {
    let branchName: string;
    do {
      branchName = faker.git.branch();
    } while (usedNames.has(branchName));
    usedNames.add(branchName);

    await prisma.branch.create({
      data: {
        name: branchName,
        handle: getBranchHandle(branchName),
        cloneUrl: "https://github.com/iFixit/react-commerce.git",
        dockerComposeDirectory: "./backend",
        repositoryId: repo.id,
      },
    });
  }

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
