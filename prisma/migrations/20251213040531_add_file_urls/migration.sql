-- AlterTable
ALTER TABLE "public"."image_descriptions" ADD COLUMN     "fileUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."metadata_generations" ADD COLUMN     "fileUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."runway_prompts" ADD COLUMN     "fileUrl" TEXT;
