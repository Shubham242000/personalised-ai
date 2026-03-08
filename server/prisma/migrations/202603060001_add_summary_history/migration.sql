-- CreateTable
CREATE TABLE "SummaryHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topics" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SummaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SummaryHistory_userId_createdAt_idx" ON "SummaryHistory"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "SummaryHistory" ADD CONSTRAINT "SummaryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
