import { faker } from "@faker-js/faker";
import { prisma } from "~/lib/db.server";
import { createBranch } from "~/models/branch.server";
import { createRepository } from "~/models/repository.server";

const BRANCH_COUNT = 10;

async function seed() {
  const repo = await createRepository({
    name: "ifixit",
    owner: "iFixit",
    dockerComposeDirectory: "./apps/strapi",
  });
  for (let i = 0; i < BRANCH_COUNT; i++) {
    await createBranch({
      branchName: faker.git.branch(),
      cloneUrl: "https://github.com/iFixit/react-commerce.git",
      dockerComposeDirectory: "./backend",
      repositoryId: repo.id,
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
