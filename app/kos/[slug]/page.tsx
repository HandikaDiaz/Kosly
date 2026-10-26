import Link from "next/link"
import { fetchQuery } from "convex/nextjs"
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  Car,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { api } from "@/convex/_generated/api"
import { buildFaqItems, buildInfoFacts, buildLodgingJsonLd, buildMetaDescription, buildRuleLines, buildTitle } from "@/convex/lib/kosInfoRules"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
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

export const dynamic = "force-dynamic"

type PublicKosPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PublicKosPageProps): Promise<Metadata> {
  const { slug } = await params
  const property = await fetchQuery(api.properties.getPublishedKosBySlug, { slug })
  if (!property) return { title: "Kos tidak ditemukan | BotKos" }
  const view = { ...property, publicKosType: property.kosType as "putra" | "putri" | "campur" | undefined, publicRules: property.rules as Parameters<typeof buildRuleLines>[0] }
  const title = buildTitle(view)
  const description = buildMetaDescription(view)
  const canonical = `/kos/${property.publicSlug}`
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website" }, twitter: { card: "summary", title, description } }
}

const facilityIcons = [Wifi, Car, Bath, BedDouble, Sparkles, ShieldCheck]

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
  const related = await fetchQuery(api.properties.getRelatedPublishedKos, { slug, limit: 4 })

  const rooms = sortRoomsByAvailability(property.rooms)
  const startingMonthlyRent = getStartingMonthlyRent(rooms)
  const mapUrls = buildMapUrls(property.publicLat, property.publicLng)
  const whatsAppNumber =
    property.contactWhatsApp ||
    process.env.NEXT_PUBLIC_BOT_WHATSAPP_NUMBER
  const telegramHandle =
    property.contactTelegram ||
    process.env.NEXT_PUBLIC_BOT_TELEGRAM_USERNAME

  const telegramUrl = buildTelegramUrl(
    telegramHandle,
    property.publicSlug
  )
  const whatsAppUrl = buildWhatsAppUrl(
    whatsAppNumber,
    property.name,
    property.publicSlug
  )
  const registrationSlug =
    property.propertySlug ||
    property.slug ||
    property.publicSlug ||
    slug
  const daftarUrl = `/${registrationSlug}/daftar`

  const hasRoomFacilities = (room: (typeof rooms)[number]) =>
    (room.bathroomFacilities?.length ?? 0) +
    (room.furnitureElectronics?.length ?? 0) >
    0

  const availableRoomsCount = rooms.filter((r) => r.isAvailable).length
  const infoFacts = buildInfoFacts({ ...property, publicKosType: property.kosType as "putra" | "putri" | "campur" | undefined, publicRules: property.rules as Parameters<typeof buildRuleLines>[0], publicLandmarks: property.landmarks })
  const faqItems = buildFaqItems({ ...property, publicKosType: property.kosType as "putra" | "putri" | "campur" | undefined, publicRules: property.rules as Parameters<typeof buildRuleLines>[0], publicLandmarks: property.landmarks })
  const jsonLd = { ...buildLodgingJsonLd({ ...property, publicRules: property.rules as Parameters<typeof buildRuleLines>[0], facilities: property.facilities }), url: `/kos/${property.publicSlug}` }

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] pb-28 sm:pb-16 flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-85"
              aria-label="Beranda BotKos"
            >
              <BotKosLogo size={28} showText={true} />
            </Link>
            <span className="text-[var(--line)] hidden sm:inline">/</span>
            <span className="hidden sm:inline-block max-w-[240px] truncate text-xs font-medium text-[var(--ink-muted)]">
              {property.name}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={daftarUrl}
              className="button-primary hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold shadow-sm"
            >
              <Sparkles size={14} />
              <span>Daftar / Booking Kamar</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* ── Hero Info & Top Actions ── */}
        <div className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              {/* Badges & Location */}
              <div className="flex flex-wrap items-center gap-2.5">
                {property.publicAreaLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--ink-muted)] border border-[var(--line)]">
                    <MapPin size={14} className="text-[var(--wood)]" />
                    <span>{property.publicAreaLabel}</span>
                  </span>
                )}
                <VerificationBadgeSlot
                  isLocationVerified={property.isLocationVerified}
                  locationVerifiedAt={property.locationVerifiedAt}
                />
                {availableRoomsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <Check size={12} className="text-emerald-600" />
                    <span>{availableRoomsCount} Kamar Tersedia</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Kamar Penuh
                  </span>
                )}
              </div>

              {/* Title & Pricing */}
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
                {property.name}
              </h1>

              {startingMonthlyRent !== null && (
                <p className="mt-3 text-sm text-[var(--ink-muted)]">
                  Harga mulai dari{" "}
                  <span className="text-2xl font-black text-[var(--wood)]">
                    {formatRupiah(startingMonthlyRent)}
                  </span>
                  <span className="text-xs font-medium text-[var(--ink-muted)]"> / bulan</span>
                </p>
              )}
            </div>

            {/* Desktop Quick Actions Box */}
            <div className="flex flex-wrap items-center gap-2.5 lg:flex-col lg:items-stretch lg:min-w-[220px]">
              {whatsAppUrl && (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MessageCircle size={15} />
                  <span>Tanya WhatsApp</span>
                </a>
              )}

              {telegramUrl && (
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
                >
                  <Send size={15} />
                  <span>Tanya Telegram</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <section aria-labelledby="info-singkat" className="mt-8 rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
          <h2 id="info-singkat" className="text-xl font-bold tracking-tight">Info singkat</h2>
          {infoFacts.length ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">{infoFacts.map((fact, index) => <div key={`${fact.label}-${index}`} className="rounded-xl bg-[var(--background)] p-3"><dt className="text-xs font-semibold text-[var(--ink-muted)]">{fact.label}</dt><dd className="mt-1 text-sm">{fact.value}</dd></div>)}</dl> : <p className="mt-3 text-sm text-[var(--ink-muted)]">Pemilik belum mengisi info singkat.</p>}
          {property.infoUpdatedAt ? <p className="mt-4 text-xs text-[var(--ink-muted)]">Info diperbarui {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(property.infoUpdatedAt))}</p> : null}
        </section>

        {faqItems.length ? <section aria-labelledby="pertanyaan-umum" className="mt-8 rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8"><h2 id="pertanyaan-umum" className="text-xl font-bold tracking-tight">Pertanyaan umum</h2><div className="mt-4 space-y-2">{faqItems.map((item) => <details key={item.question} className="rounded-xl border border-[var(--line)] p-4"><summary className="cursor-pointer text-sm font-semibold">{item.question}</summary><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{item.answer}</p></details>)}</div></section> : null}

        {related.length && property.publicAreaLabel ? <section aria-labelledby="kos-lain" className="mt-8 rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8"><h2 id="kos-lain" className="text-xl font-bold tracking-tight">Kos lain di {property.publicAreaLabel}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{related.map((item) => <Link key={item.slug} href={`/kos/${item.slug}`} className="rounded-xl border border-[var(--line)] p-4 hover:border-[var(--wood)]"><p className="font-semibold">{item.name}</p>{item.hargaMulai !== undefined ? <p className="mt-1 text-sm text-[var(--wood)]">Mulai {formatRupiah(item.hargaMulai)}/bulan</p> : null}{item.isLocationVerified ? <p className="mt-2 text-xs text-emerald-700">Lokasi terverifikasi</p> : null}</Link>)}</div></section> : null}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* ── Photo Gallery Section ── */}
        <div className="mt-8">
          <PublicPropertyGallery
            photos={property.photos}
            propertyName={property.name}
          />
        </div>

        {/* ── Details & Sidebar Layout ── */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-12">
            {/* Description */}
            {property.publicDescription && (
              <section aria-labelledby="deskripsi" className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
                <h2 id="deskripsi" className="text-xl font-bold tracking-tight text-[var(--ink)]">
                  Tentang Kos Ini
                </h2>
                <div className="mt-4 text-sm leading-7 text-[var(--ink-muted)] whitespace-pre-wrap">
                  {property.publicDescription}
                </div>
              </section>
            )}

            {/* General Facilities */}
            {property.facilities.length > 0 && (
              <section aria-labelledby="fasilitas-umum" className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
                <h2 id="fasilitas-umum" className="text-xl font-bold tracking-tight text-[var(--ink)]">
                  Fasilitas Umum & Sekitar
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {property.facilities.map((facility, index) => {
                    const Icon = facilityIcons[index % facilityIcons.length]
                    return (
                      <li
                        key={`${facility.category}-${facility.name}`}
                        className="flex gap-3.5 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4 transition hover:bg-white"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--line)] text-[var(--wood)] shadow-2xs">
                          <Icon size={18} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {facility.name}
                          </p>
                          {facility.description && (
                            <p className="mt-0.5 text-xs leading-5 text-[var(--ink-muted)]">
                              {facility.description}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* Available Rooms Section */}
            <section aria-labelledby="pilihan-kamar" className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--line)] pb-5">
                <div>
                  <h2 id="pilihan-kamar" className="text-xl font-bold tracking-tight text-[var(--ink)]">
                    Pilihan Kamar
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Pilih tipe kamar yang sesuai kebutuhan Anda dan lakukan pendaftaran langsung.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--gold-pale)] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
                  {rooms.length} Kamar Terdaftar
                </span>
              </div>

              {rooms.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <article
                      key={room.label}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--background)]/40 p-5 shadow-2xs transition hover:border-[var(--gold)]/60 hover:bg-white hover:shadow-sm"
                    >
                      <div>
                        {/* Header Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--gold-dark)]">
                              Nomor Kamar
                            </span>
                            <h3 className="text-lg font-bold text-[var(--ink)]">
                              Kamar {room.label}
                            </h3>
                            {room.roomType && (
                              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                                Tipe: {room.roomType}
                              </p>
                            )}
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${room.isAvailable
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {room.isAvailable ? "Tersedia" : "Penuh"}
                          </span>
                        </div>

                        {/* Room dimensions */}
                        {room.sizeSqm !== undefined && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                            <Maximize2 size={13} aria-hidden="true" />
                            <span>Luas: {room.sizeSqm} m²</span>
                          </div>
                        )}

                        {/* Facilities */}
                        {hasRoomFacilities(room) && (
                          <div className="mt-4 border-t border-[var(--line)]/70 pt-3">
                            <p className="text-[11px] font-semibold text-[var(--ink-muted)]">
                              Fasilitas Kamar:
                            </p>
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                              {[
                                ...(room.bathroomFacilities ?? []),
                                ...(room.furnitureElectronics ?? []),
                              ].map((facility) => (
                                <li
                                  key={facility}
                                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--ink)]"
                                >
                                  <Check size={11} className="text-[var(--wood)]" />
                                  <span>{facility}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Pricing & Booking CTA */}
                      <div className="mt-5 border-t border-[var(--line)]/70 pt-4">
                        <div className="flex items-baseline justify-between">
                          <div>
                            {typeof room.monthlyRent === "number" && (
                              <div>
                                <p className="text-[11px] text-[var(--ink-muted)]">Sewa Bulanan</p>
                                <p className="text-lg font-extrabold text-[var(--wood)]">
                                  {formatRupiah(room.monthlyRent)}
                                </p>
                              </div>
                            )}
                            {typeof room.annualRent === "number" && (
                              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                                Tahunan: {formatRupiah(room.annualRent)}
                              </p>
                            )}
                          </div>

                          {room.isAvailable ? (
                            <Link
                              href={daftarUrl}
                              className="button-primary inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold shadow-xs"
                            >
                              <span>Daftar</span>
                              <ChevronRight size={14} />
                            </Link>
                          ) : (
                            <span className="text-xs text-[var(--ink-muted)] italic">
                              Tidak tersedia
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--background)] p-8 text-center text-xs text-[var(--ink-muted)]">
                  Belum ada data kamar yang dapat ditampilkan untuk kos ini.
                </p>
              )}
            </section>

            {/* Reviews Slot */}
            <div className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
              <ReviewsSlot
                propertySlug={property.publicSlug}
                initialReviews={initialReviews ?? { reviews: [], nextCursor: null }}
                reviewCount={property.reviewCount}
                ratingAverage={property.ratingAverage}
              />
            </div>
          </div>

          {/* ── Sidebar (Location & Map) ── */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[var(--wood)]" />
                <h2 className="font-bold text-base text-[var(--ink)]">Lokasi Properti</h2>
              </div>

              <p className="mt-3 text-xs leading-6 text-[var(--ink-muted)]">
                {property.address || "Lokasi ditampilkan secara perkiraan untuk kenyamanan privasi."}
              </p>

              {mapUrls && (
                <div className="mt-4">
                  <iframe
                    title={`Peta lokasi ${property.name}`}
                    src={mapUrls.osmEmbedUrl}
                    loading="lazy"
                    className="aspect-square w-full rounded-2xl border border-[var(--line)]"
                  />
                  <a
                    href={mapUrls.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--wood)] hover:underline"
                  >
                    <span>Buka Rute di Google Maps</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </section>

            {/* Quick Inquire Sidebar Widget */}
            {(telegramUrl || whatsAppUrl) && (
              <section className="rounded-3xl border border-[var(--line)] bg-gradient-to-br from-[var(--background)] to-amber-50/20 p-6 shadow-sm">
                <h3 className="font-bold text-sm text-[var(--ink)]">
                  Punya Pertanyaan Khusus?
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                  Hubungi pengelola kos langsung untuk menanyakan survei lokasi, aturan kos, atau ketersediaan parkir.
                </p>

                <div className="mt-4 space-y-2">
                  {whatsAppUrl && (
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <MessageCircle size={15} />
                      <span>Chat WhatsApp Pengelola</span>
                    </a>
                  )}
                  {telegramUrl && (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
                    >
                      <Send size={15} />
                      <span>Chat Telegram BotKos</span>
                    </a>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      {/* ── Mobile Sticky Bottom Action Bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[#FFFFFF]/95 p-3.5 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            {startingMonthlyRent !== null && (
              <>
                <p className="text-[10px] text-[var(--ink-muted)] truncate">Mulai dari</p>
                <p className="text-sm font-extrabold text-[var(--wood)] truncate">
                  {formatRupiah(startingMonthlyRent)}<span className="text-[10px] font-normal text-[var(--ink-muted)]">/bln</span>
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {whatsAppUrl && (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"
                aria-label="Tanya via WhatsApp"
              >
                <MessageCircle size={17} />
              </a>
            )}
            <Link
              href={daftarUrl}
              className="button-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold shadow-md"
            >
              <Sparkles size={14} />
              <span>Daftar Sewa</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Cohesive Footer ── */}
      <footer className="mt-auto border-t border-[var(--line)] bg-[#FFFFFF] px-4 py-6 text-center text-xs text-[var(--ink-muted)]">
        <p>BotKos — Sistem Manajemen Kos & Komunitas Terpercaya</p>
      </footer>
    </div>
  )
}
