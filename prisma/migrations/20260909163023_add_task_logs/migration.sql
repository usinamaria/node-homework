-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "status" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
