import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@siu.test" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@siu.test",
      passwordHash: await hashPassword("AdminPass123!"),
      role: "ADMIN",
    },
  });

  const invigilator = await prisma.user.upsert({
    where: { email: "invigilator@siu.test" },
    update: {},
    create: {
      name: "Invigilator User",
      email: "invigilator@siu.test",
      passwordHash: await hashPassword("InvigilatorPass123!"),
      role: "INVIGILATOR",
    },
  });

  const programs = await Promise.all(
    ["Software Engineering", "Cybersecurity", "Business"].map((name) =>
      prisma.program.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const studentSeeds = [
    { matricNumber: "SIU25SWE001", fullName: "John Doe", program: 0 },
    { matricNumber: "SIU25CYB014", fullName: "Mary Jane", program: 1 },
    { matricNumber: "SIU25BUS009", fullName: "Peter Paul", program: 2 },
    { matricNumber: "SIU25SWE002", fullName: "Ada Obi", program: 0 },
    { matricNumber: "SIU25CYB015", fullName: "Chidi Eze", program: 1 },
  ];

  for (const s of studentSeeds) {
    await prisma.student.upsert({
      where: { matricNumber: s.matricNumber },
      update: {},
      create: {
        matricNumber: s.matricNumber,
        fullName: s.fullName,
        year: "YEAR_1",
        programId: programs[s.program].id,
      },
    });
  }

  console.log("Seeded:", {
    admin: admin.email,
    invigilator: invigilator.email,
    programs: programs.map((p) => p.name),
    students: studentSeeds.length,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
