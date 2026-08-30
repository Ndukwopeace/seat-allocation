import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

export async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.seatAssignment.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.student.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();
}

export async function makeUser(role: "ADMIN" | "INVIGILATOR") {
  return prisma.user.create({
    data: {
      name: role === "ADMIN" ? "Test Admin" : "Test Invigilator",
      email: `${role.toLowerCase()}-${crypto.randomUUID()}@test.local`,
      passwordHash: await hashPassword("irrelevant"),
      role,
    },
  });
}

export async function makeProgram(name: string) {
  return prisma.program.create({ data: { name } });
}

export async function makeExamSession(year: "YEAR_1" | "YEAR_2" = "YEAR_1") {
  return prisma.examSession.create({
    data: {
      year,
      label: "Test Session",
      date: new Date("2026-06-01"),
      startTime: new Date("2026-06-01T09:00:00Z"),
      endTime: new Date("2026-06-01T11:00:00Z"),
    },
  });
}

export async function makeStudents(
  count: number,
  programId: string,
  year: "YEAR_1" | "YEAR_2" = "YEAR_1",
) {
  const students = [];
  for (let i = 0; i < count; i++) {
    students.push(
      await prisma.student.create({
        data: {
          matricNumber: `TEST-${year}-${crypto.randomUUID()}`,
          fullName: `Student ${i}`,
          year,
          programId,
        },
      }),
    );
  }
  return students;
}
