/* eslint-disable */
require("dotenv").config();
const { createHash, randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const placeholderImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGAAAAAEAAGjCh0IAAAAAElFTkSuQmCC";

function hashOwnerToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function resetDb() {
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Submission";`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Profile";`);
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Profile" (
      id TEXT PRIMARY KEY,
      displayName TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      ownerTokenHash TEXT UNIQUE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Submission" (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL,
      imageData TEXT NOT NULL,
      note TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(profileId) REFERENCES Profile(id) ON DELETE CASCADE
    );
  `);
}

async function run() {
  await resetDb();

  const samples = [
    {
      id: randomUUID(),
      displayName: "Mystic Fox",
      slug: "mystic-fox",
      ownerToken: "demo-mystic-fox-owner-link",
    },
    {
      id: randomUUID(),
      displayName: "Astro Skater",
      slug: "astro-skater",
      ownerToken: "demo-astro-skater-owner-link",
    },
  ];

  await prisma.profile.createMany({
    data: samples.map((sample) => ({
      id: sample.id,
      displayName: sample.displayName,
      slug: sample.slug,
      ownerTokenHash: hashOwnerToken(sample.ownerToken),
    })),
  });

  await prisma.submission.createMany({
    data: [
      {
        id: randomUUID(),
        profileId: samples[0].id,
        imageData: placeholderImage,
        note: "You look like a dreamy comic-book hero.",
      },
      {
        id: randomUUID(),
        profileId: samples[1].id,
        imageData: placeholderImage,
        note: "Space skater energy all the way.",
      },
    ],
  });

  console.log("Demo inboxes created:");
  for (const sample of samples) {
    console.log(`- ${sample.displayName}`);
    console.log(`  Public: ${appUrl}/${sample.slug}`);
    console.log(`  Owner:  ${appUrl}/owner/${sample.ownerToken}`);
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
