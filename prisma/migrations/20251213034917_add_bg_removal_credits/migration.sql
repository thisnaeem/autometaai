-- CreateEnum
CREATE TYPE "public"."CreditType" AS ENUM ('GENERAL', 'BG_REMOVAL');

-- AlterTable
ALTER TABLE "public"."payment_requests" ADD COLUMN     "creditType" "public"."CreditType" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "bgRemovalCredits" INTEGER NOT NULL DEFAULT 0;
