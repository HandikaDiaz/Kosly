"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MediaItem = {
  _id: string
  kind: "photo" | "video"
  url: string | null
  caption?: string
}

interface RoomCardCarouselProps {
  media: MediaItem[]
  roomNumber: string
  className?: string
}

export function RoomCardCarousel({
  media,
  roomNumber,
  className,
}: RoomCardCarouselProps) {
  const [index, setIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const validMedia = media.filter((item) => item.url !== null)
  const defaultClasses = "h-40 flex-1 min-w-0"

  if (validMedia.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center border border-dashed border-[var(--line)] bg-[var(--background)] text-center text-xs text-[var(--ink-muted)]",
          className ?? defaultClasses
        )}
      >
        <ImageIcon size={22} className="text-[var(--ink-muted)] opacity-60" />
        <span className="mt-1.5 text-[11px]">Belum ada foto</span>
      </div>
    )
  }

  const current = validMedia[index % validMedia.length]

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((prev) => (prev - 1 + validMedia.length) % validMedia.length)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((prev) => (prev + 1) % validMedia.length)
  }

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd
    if (diff > 35) {
      // Swiped left -> next image
      setIndex((prev) => (prev + 1) % validMedia.length)
    } else if (diff < -35) {
      // Swiped right -> prev image
      setIndex((prev) => (prev - 1 + validMedia.length) % validMedia.length)
    }
    setTouchStart(null)
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "relative overflow-hidden border border-[var(--line)] bg-black/5 group shadow-sm select-none",
        className ?? defaultClasses
      )}
    >
      {current.kind === "photo" ? (
        <img
          src={current.url ?? ""}
          alt={current.caption ?? `Foto kamar ${roomNumber}`}
          className="h-full w-full object-cover transition-opacity duration-200"
        />
      ) : (
        <video
          src={current.url ?? ""}
          className="h-full w-full object-cover"
        />
      )}

      {/* Caption overlay */}
      {current.caption && (
        <div className="absolute bottom-0 inset-x-0 z-10 bg-black/60 px-2 py-1 text-[10px] text-white truncate text-center">
          {current.caption}
        </div>
      )}

      {/* Slide show controls (arrows & counter) if more than 1 media */}
      {validMedia.length > 1 && (
        <>
          {/* Left Arrow (Always visible on mobile/touch, hover-revealed on desktop) */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto sebelumnya"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-90 transition-all sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/90 active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Right Arrow (Always visible on mobile/touch, hover-revealed on desktop) */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Foto berikutnya"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-90 transition-all sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/90 active:scale-95"
          >
            <ChevronRight size={16} />
          </button>

          {/* Counter Badge */}
          <div className="absolute top-1.5 right-1.5 z-20 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {index + 1}/{validMedia.length}
          </div>
        </>
      )}
    </div>
  )
}
