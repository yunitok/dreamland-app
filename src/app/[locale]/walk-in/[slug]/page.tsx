import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { AvailabilityView } from "@/modules/walk-in/ui/availability-view"
import { generateWalkInToken } from "@/modules/walk-in/domain/walk-in-token"
import { getSession } from "@/lib/auth"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

/** Find location by walkInToken first, then fallback to cmSlug (legacy QR compatibility) */
async function findLocation(slug: string) {
  return (
    (await prisma.restaurantLocation.findFirst({
      where: { walkInToken: slug, isActive: true },
      select: { name: true, address: true, city: true, cmSlug: true },
    })) ??
    (await prisma.restaurantLocation.findFirst({
      where: { cmSlug: slug, isActive: true },
      select: { name: true, address: true, city: true, cmSlug: true },
    }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const location = await findLocation(slug)

  if (!location) return { title: "Not Found" }

  return {
    title: `${location.name} — Walk-in`,
    description: `Check real-time availability at ${location.name}`,
  }
}

export default async function WalkInPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const location = await findLocation(slug)

  if (!location || !location.cmSlug) notFound()

  const walkInToken = generateWalkInToken(location.cmSlug)

  // Detectar SUPER_ADMIN (null si visitante público sin sesión)
  const session = await getSession()
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  return (
    <AvailabilityView
      slug={location.cmSlug}
      restaurantName={location.name}
      restaurantAddress={location.address ?? ""}
      restaurantCity={location.city ?? ""}
      token={walkInToken}
      isAdmin={isAdmin}
    />
  )
}
