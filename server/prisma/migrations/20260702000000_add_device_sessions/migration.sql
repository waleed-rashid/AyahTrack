-- AlterTable
ALTER TABLE "User" ADD COLUMN "deviceToken" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sabaqSeconds" INTEGER NOT NULL DEFAULT 0,
    "sabaqParaSeconds" INTEGER NOT NULL DEFAULT 0,
    "revisionSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_deviceToken_key" ON "User"("deviceToken");

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
