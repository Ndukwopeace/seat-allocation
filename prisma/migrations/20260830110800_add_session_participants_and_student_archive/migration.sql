-- AlterTable
ALTER TABLE "students" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "session_participants" (
    "id" TEXT NOT NULL,
    "examSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_participants_examSessionId_studentId_key" ON "session_participants"("examSessionId", "studentId");

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "exam_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: session rosters are new — before this migration, a
-- session's population was implicitly "every student whose year matches".
-- Backfill that exact same population into session_participants for every
-- exam session that already exists, so no existing session's roster (and
-- therefore its next regenerate) silently changes because of this schema
-- change. New sessions get their initial roster from application code
-- (createExamSession) instead of this one-time backfill.
INSERT INTO "session_participants" ("id", "examSessionId", "studentId", "addedAt")
SELECT gen_random_uuid()::text, es."id", s."id", CURRENT_TIMESTAMP
FROM "exam_sessions" es
JOIN "students" s ON s."year" = es."year"
ON CONFLICT ("examSessionId", "studentId") DO NOTHING;
