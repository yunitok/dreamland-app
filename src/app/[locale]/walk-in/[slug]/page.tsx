import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { AvailabilityView } from "@/modules/walk-in/ui/availability-view"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const location = await prisma.restaurantLocation.findFirst({
    where: { cmSlug: slug, isActive: true },
    select: { name: true },
  })

  if (!location) return { title: "Not Found" }

  return {
    title: `${location.name} — Walk-in`,
    description: `Check real-time availability at ${location.name}`,
  }
}

export default async function WalkInPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const location = await prisma.restaurantLocation.findFirst({
    where: { cmSlug: slug, isActive: true },
    select: { name: true, address: true, city: true, cmSlug: true },
  })

  if (!location || !location.cmSlug) notFound()

  return (
    <AvailabilityView
      slug={location.cmSlug}
      restaurantName={location.name}
      restaurantAddress={location.address ?? ""}
      restaurantCity={location.city ?? ""}
    />
  )
}
