-- CreateTable
CREATE TABLE "public"."batch_operations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "batch_operations_userId_idx" ON "public"."batch_operations"("userId");

-- CreateIndex
CREATE INDEX "batch_operations_createdAt_idx" ON "public"."batch_operations"("createdAt");

-- CreateIndex
CREATE INDEX "batch_operations_userId_type_idx" ON "public"."batch_operations"("userId", "type");

-- AddForeignKey
ALTER TABLE "public"."batch_operations" ADD CONSTRAINT "batch_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
