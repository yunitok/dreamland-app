/*
  Warnings:

  - Added the required column `description` to the `weather_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `forecastDate` to the `weather_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `weather_alerts` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `alertType` on the `weather_alerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WeatherAlertType" AS ENUM ('RAIN', 'WIND', 'TEMPERATURE_HIGH', 'TEMPERATURE_LOW', 'STORM', 'SNOW', 'HAIL', 'FOG');

-- CreateEnum
CREATE TYPE "WeatherAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WeatherAlertStatus" AS ENUM ('ACTIVE', 'MONITORING', 'RESOLVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WeatherAlertSource" AS ENUM ('MANUAL', 'AEMET', 'OPENWEATHERMAP');

-- AlterTable
ALTER TABLE "weather_alerts" ADD COLUMN     "actionsTaken" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "forecastDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL DEFAULT 'Restaurante Dreamland',
ADD COLUMN     "precipitationMm" DOUBLE PRECISION,
ADD COLUMN     "rawForecastData" JSONB,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "severity" "WeatherAlertSeverity" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "source" "WeatherAlertSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "WeatherAlertStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "temperatureC" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "windSpeedKmh" DOUBLE PRECISION,
DROP COLUMN "alertType",
ADD COLUMN     "alertType" "WeatherAlertType" NOT NULL;

-- CreateIndex
CREATE INDEX "weather_alerts_status_idx" ON "weather_alerts"("status");

-- CreateIndex
CREATE INDEX "weather_alerts_severity_idx" ON "weather_alerts"("severity");

-- CreateIndex
CREATE INDEX "weather_alerts_forecastDate_idx" ON "weather_alerts"("forecastDate");

-- CreateIndex
CREATE INDEX "weather_alerts_alertType_idx" ON "weather_alerts"("alertType");
