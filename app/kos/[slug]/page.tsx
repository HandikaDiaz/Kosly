import Link from "next/link"
import { fetchQuery } from "convex/nextjs"
import {
  Bath,
  BedDouble,
  Car,
  Check,
  ExternalLink,
  MapPin,
  Maximize2,
  MessageCircle,
  Send,
  Sparkles,
  Wifi,
} from "lucide-react"
import { notFound } from "next/navigation"
import { api } from "@/convex/_generated/api"
import {
  VerificationBadgeSlot,
  ReviewsSlot,
} from "@/components/public-kos/future-trust-slots"
import { PublicPropertyGallery } from "@/components/public-kos/public-property-gallery"
import {
  buildMapUrls,
  buildTelegramUrl,
  buildWhatsAppUrl,
  formatRupiah,
  getStartingMonthlyRent,
  sortRoomsByAvailability,
} from "@/lib/public-kos"

export const revalidate = 60

type PublicKosPageProps = {
  params: Promise<{ slug: string }>
}

const facilityIcons = [Wifi, Car, Bath, BedDouble, Sparkles]

export default async function PublicKosPage({ params }: PublicKosPageProps) {
  const { slug } = await params
  const property = await fetchQuery(api.properties.getPublishedKosBySlug, {
    slug,
  })

  if (!property) notFound()
  const initialReviews = await fetchQuery(api.reviews.listPublishedReviews, {
    slug,
    limit: 10,
  })

  const rooms = sortRoomsByAvailability(property.rooms)
  const startingMonthlyRent = getStartingMonthlyRent(rooms)
  const mapUrls = buildMapUrls(property.publicLat, property.publicLng)
  const telegramUrl = buildTelegramUrl(
    process.env.NEXT_PUBLIC_BOT_TELEGRAM_USERNAME,
    property.publicSlug
  )
  const whatsAppUrl = buildWhatsAppUrl(
    process.env.NEXT_PUBLIC_BOT_WHATSAPP_NUMBER,
    property.name,
    property.publicSlug
  )
  const hasRoomFacilities = (room: (typeof rooms)[number]) =>
    (room.bathroomFacilities?.length ?? 0) +
      (room.furnitureElectronics?.length ?? 0) >
    0

  return (
    <div className="min-h-svh pb-24 text-[var(--ink)] sm:pb-12">
      <header className="border-b border-[var(--line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="brand-mark" aria-hidden="true">
            B
          </div>
          <Link
            href="/"
            className="font-semibold tracking-tight hover:text-[var(--wood)]"
          >
            BotKos
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {property.publicAreaLabel ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-muted)]">
                  <MapPin
                    size={16}
                    className="text-[var(--wood)]"
                    aria-hidden="true"
                  />
                  {property.publicAreaLabel}
                </p>
              ) : null}
              <VerificationBadgeSlot
                isLocationVerified={property.isLocationVerified}
                locationVerifiedAt={property.locationVerifiedAt}
              />
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {property.name}
            </h1>
            {startingMonthlyRent !== null ? (
              <p className="mt-3 text-sm text-[var(--ink-muted)]">
                Harga mulai{" "}
                <span className="font-semibold text-[var(--wood)]">
                  {formatRupiah(startingMonthlyRent)}
                </span>
                <span> / bulan</span>
              </p>
            ) : null}
          </div>

          {telegramUrl || whatsAppUrl ? (
            <aside className="hidden rounded-xl border border-[var(--line)] bg-white p-4 lg:block">
              <p className="text-sm font-semibold">Tertarik dengan kos ini?</p>
              <div className="mt-3 grid gap-2">
                {telegramUrl ? (
                  <ContactLink
                    href={telegramUrl}
                    icon={<Send size={16} />}
                    label="Tanya via Telegram"
                  />
                ) : null}
                {whatsAppUrl ? (
                  <ContactLink
                    href={whatsAppUrl}
                    icon={<MessageCircle size={16} />}
                    label="Tanya via WhatsApp"
                  />
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>

        <div className="mt-7">
          <PublicPropertyGallery
            photos={property.photos}
            propertyName={property.name}
          />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-10">
            {property.publicDescription ? (
              <section aria-labelledby="deskripsi">
                <h2 id="deskripsi" className="text-xl font-bold">
                  Tentang kos ini
                </h2>
                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-[var(--ink-muted)]">
                  {property.publicDescription}
                </p>
              </section>
            ) : null}

            {property.facilities.length > 0 ? (
              <section aria-labelledby="fasilitas-umum">
                <h2 id="fasilitas-umum" className="text-xl font-bold">
                  Fasilitas umum
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {property.facilities.map((facility, index) => {
                    const Icon = facilityIcons[index % facilityIcons.length]
                    return (
                      <li
                        key={`${facility.category}-${facility.name}`}
                        className="flex gap-3 rounded-xl border border-[var(--line)] bg-white p-4"
                      >
                        <Icon
                          className="mt-0.5 shrink-0 text-[var(--wood)]"
                          size={19}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold">
                            {facility.name}
                          </p>
                          {facility.description ? (
                            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                              {facility.description}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="pilihan-kamar">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="pilihan-kamar" className="text-xl font-bold">
                  Pilihan kamar
                </h2>
                <span className="text-xs text-[var(--ink-muted)]">
                  {rooms.length} kamar
                </span>
              </div>
              {rooms.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <article
                      key={room.label}
                      className="rounded-xl border border-[var(--line)] bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Kamar {room.label}</h3>
                          {room.roomType ? (
                            <p className="mt-1 text-xs text-[var(--ink-muted)]">
                              {room.roomType}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${room.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-[var(--secondary)] text-[var(--ink-muted)]"}`}
                        >
                          {room.isAvailable ? "Tersedia" : "Tidak tersedia"}
                        </span>
                      </div>
                      {room.sizeSqm !== undefined ? (
                        <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                          <Maximize2 size={14} aria-hidden="true" />{" "}
                          {room.sizeSqm} m²
                        </p>
                      ) : null}
                      {hasRoomFacilities(room) ? (
                        <div className="mt-4 border-t border-[var(--line)] pt-4">
                          <p className="text-xs font-medium text-[var(--ink-muted)]">
                            Fasilitas kamar
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {[
                              ...(room.bathroomFacilities ?? []),
                              ...(room.furnitureElectronics ?? []),
                            ].map((facility) => (
                              <li
                                key={facility}
                                className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2 py-1 text-xs"
                              >
                                <Check
                                  size={12}
                                  className="text-[var(--wood)]"
                                  aria-hidden="true"
                                />
                                {facility}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {typeof room.monthlyRent === "number" ||
                      typeof room.annualRent === "number" ? (
                        <div className="mt-4 border-t border-[var(--line)] pt-4 text-sm">
                          {typeof room.monthlyRent === "number" ? (
                            <p>
                              <span className="text-[var(--ink-muted)]">
                                Bulanan{" "}
                              </span>
                              <span className="font-semibold text-[var(--wood)]">
                                {formatRupiah(room.monthlyRent)}
                              </span>
                            </p>
                          ) : null}
                          {typeof room.annualRent === "number" ? (
                            <p className="mt-1">
                              <span className="text-[var(--ink-muted)]">
                                Tahunan{" "}
                              </span>
                              <span className="font-semibold text-[var(--wood)]">
                                {formatRupiah(room.annualRent)}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-white p-6 text-sm text-[var(--ink-muted)]">
                  Belum ada kamar yang dapat ditampilkan.
                </p>
              )}
            </section>
            <ReviewsSlot propertySlug={property.publicSlug} initialReviews={initialReviews ?? { reviews: [], nextCursor: null }} reviewCount={property.reviewCount} ratingAverage={property.ratingAverage} />
          </div>

          <aside className="space-y-5">
            {property.address || mapUrls ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-5">
                <h2 className="font-semibold">Lokasi</h2>
                {property.address ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {property.address}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    Lokasi ditampilkan secara perkiraan.
                  </p>
                )}
                {mapUrls ? (
                  <>
                    <iframe
                      title={`Peta lokasi ${property.name}`}
                      src={mapUrls.osmEmbedUrl}
                      loading="lazy"
                      className="mt-4 aspect-square w-full rounded-lg border border-[var(--line)]"
                    />
                    <a
                      href={mapUrls.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--wood)] hover:underline"
                    >
                      Buka di Google Maps{" "}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </>
                ) : null}
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      {telegramUrl || whatsAppUrl ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">
            {telegramUrl ? (
              <ContactLink
                href={telegramUrl}
                icon={<Send size={16} />}
                label="Telegram"
              />
            ) : null}
            {whatsAppUrl ? (
              <ContactLink
                href={whatsAppUrl}
                icon={<MessageCircle size={16} />}
                label="WhatsApp"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="border-t border-[var(--line)] bg-white px-4 py-6 text-center text-xs text-[var(--ink-muted)]">
        Ditenagai oleh BotKos
      </footer>
    </div>
  )
}

const ContactLink = ({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="button-primary flex flex-1 justify-center text-xs"
  >
    {icon}
    {label}
  </a>
)
