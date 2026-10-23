"use client"

import Image from "next/image"
import { useState } from "react"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

type PublicPhoto = {
  url: string
  sortOrder: number
}

type PublicPropertyGalleryProps = {
  photos: PublicPhoto[]
  propertyName: string
}

export const PublicPropertyGallery = ({
  photos,
  propertyName,
}: PublicPropertyGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white p-6 text-center sm:aspect-[2/1]">
        <div>
          <ImageIcon className="mx-auto text-[var(--wood)]/60" size={32} />
          <p className="mt-3 text-sm font-medium text-[var(--ink)]">
            Foto properti belum tersedia
          </p>
        </div>
      </div>
    )
  }

  const activePhoto = photos[activeIndex]
  const selectPhoto = (index: number) => setActiveIndex(index)

  return (
    <section aria-label={`Galeri foto ${propertyName}`}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--secondary)] shadow-sm sm:aspect-[2/1]">
        <Image
          src={activePhoto.url}
          alt={`Foto ${activeIndex + 1} ${propertyName}`}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 1024px) 100vw, 896px"
          className="object-cover"
        />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() =>
                selectPhoto((activeIndex - 1 + photos.length) % photos.length)
              }
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)]"
              aria-label="Foto sebelumnya"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => selectPhoto((activeIndex + 1) % photos.length)}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)]"
              aria-label="Foto berikutnya"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          aria-label="Pilih foto"
        >
          {photos.map((photo, index) => (
            <button
              key={`${photo.sortOrder}-${photo.url}`}
              type="button"
              onClick={() => selectPhoto(index)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wood)] ${
                index === activeIndex
                  ? "border-[var(--wood)]"
                  : "border-transparent opacity-75 hover:opacity-100"
              }`}
              aria-label={`Tampilkan foto ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
