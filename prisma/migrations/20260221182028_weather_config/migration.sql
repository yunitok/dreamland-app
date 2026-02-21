-- CreateTable
CREATE TABLE "weather_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "rainProbability" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "rainMm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "windSpeed" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "windGust" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "temperatureLow" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "temperatureHigh" DOUBLE PRECISION NOT NULL DEFAULT 36,
    "serviceHoursStart" INTEGER NOT NULL DEFAULT 12,
    "serviceHoursEnd" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_config_pkey" PRIMARY KEY ("id")
);
