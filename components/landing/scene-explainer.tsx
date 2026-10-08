"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  Link2,
  FileText,
  BellRing,
  BadgeCheck,
  CalendarClock,
} from "lucide-react"

/* ─── Scene definitions ──────────────────────────────────────── */

const SCENES = [
  {
    id: 1,
    caption: "Bagikan satu link ke calon penyewa",
    icon: Link2,
    visual: "link-share",
  },
  {
    id: 2,
    caption: "Penyewa isi data & upload bukti sendiri",
    icon: FileText,
    visual: "form-fill",
  },
  {
    id: 3,
    caption: "Notifikasi langsung ke chat pemilik",
    icon: BellRing,
    visual: "notification",
  },
  {
    id: 4,
    caption: "Satu tap, kamar langsung ter-update",
    icon: BadgeCheck,
    visual: "room-update",
  },
  {
    id: 5,
    caption: "Reminder otomatis, kas tetap lancar tiap bulan",
    icon: CalendarClock,
    visual: "reminder",
  },
] as const

const DURATION = 4500 // ms per scene

/* ─── Scene visuals ──────────────────────────────────────────── */

function SceneLinkShare({ reduced }: { reduced: boolean }) {
  return (
    <div className="lp-scene-wrap">
      {/* Owner */}
      <motion.div
        className="lp-avatar lp-avatar-gold"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : 0.4 }}
      >
        <span>P</span>
        <small>Pemilik</small>
      </motion.div>

      {/* Link pill flying across */}
      <motion.div
        className="lp-link-pill"
        initial={{ opacity: 0, scale: 0.7, x: -40 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.45 }}
      >
        <Link2 size={13} />
        botkos.id/daftar/kamar-3
      </motion.div>

      {/* Tenant */}
      <motion.div
        className="lp-avatar lp-avatar-sage"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.15 }}
      >
        <span>T</span>
        <small>Penyewa</small>
      </motion.div>
    </div>
  )
}

const FORM_FIELDS = ["Nama lengkap", "No. KTP", "Tanggal masuk", "Upload bukti"]

function SceneFormFill({ reduced }: { reduced: boolean }) {
  return (
    <div className="lp-scene-wrap lp-scene-column">
      <div className="lp-form-mock">
        {FORM_FIELDS.map((label, i) => (
          <motion.div
            key={label}
            className="lp-form-row"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduced ? 0 : 0.35,
              delay: reduced ? 0 : 0.3 + i * 0.28,
            }}
          >
            <span className="lp-form-label">{label}</span>
            <motion.span
              className="lp-form-value"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{
                duration: reduced ? 0 : 0.5,
                delay: reduced ? 0 : 0.55 + i * 0.28,
              }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneNotification({ reduced }: { reduced: boolean }) {
  return (
    <div className="lp-scene-wrap lp-scene-column" style={{ gap: "0.75rem" }}>
      {/* Phone frame */}
      <motion.div
        className="lp-phone-frame"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.4 }}
      >
        <div className="lp-chat-header">
          <span className="lp-chat-dot" />
          BotKos
        </div>
        <AnimatePresence>
          <motion.div
            className="lp-chat-bubble"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduced ? 0 : 0.45, delay: reduced ? 0 : 0.5 }}
          >
            <p className="lp-chat-title">✅ Pembayaran masuk</p>
            <p className="lp-chat-body">Kamar 03 · Rp 1.800.000</p>
            <p className="lp-chat-body">Agus Santoso · 8 Okt</p>
            <p className="lp-chat-action">Ketuk untuk review →</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function SceneRoomUpdate({ reduced }: { reduced: boolean }) {
  const [updated, setUpdated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setUpdated(true), reduced ? 0 : 900)
    return () => clearTimeout(t)
  }, [reduced])

  return (
    <div className="lp-scene-wrap lp-scene-column">
      <div className="lp-room-card">
        <div className="lp-room-label">Kamar 03</div>
        <motion.div
          className={`lp-room-badge ${updated ? "lp-room-badge-filled" : "lp-room-badge-available"}`}
          layout
          transition={{ duration: reduced ? 0 : 0.4, type: "spring", bounce: 0.3 }}
        >
          {updated ? (
            <motion.span
              key="filled"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
              className="lp-room-badge-inner"
            >
              <BadgeCheck size={14} /> Terisi
            </motion.span>
          ) : (
            <motion.span key="available" className="lp-room-badge-inner">
              Tersedia
            </motion.span>
          )}
        </motion.div>
      </div>
    </div>
  )
}

const MONTHS = ["Sep", "Okt", "Nov", "Des"]

function SceneReminder({ reduced }: { reduced: boolean }) {
  return (
    <div className="lp-scene-wrap lp-scene-column">
      <div className="lp-calendar-strip">
        {MONTHS.map((m, i) => (
          <motion.div
            key={m}
            className="lp-cal-month"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.2 + i * 0.2 }}
          >
            <div className="lp-cal-name">{m}</div>
            <motion.div
              className="lp-cal-check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                bounce: 0.5,
                delay: reduced ? 0 : 0.5 + i * 0.2,
                duration: reduced ? 0 : 0.4,
              }}
            >
              ✓
            </motion.div>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="lp-reminder-label"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 1.2 }}
      >
        Reminder otomatis setiap tanggal 1
      </motion.p>
    </div>
  )
}

function renderVisual(visual: string, reduced: boolean) {
  switch (visual) {
    case "link-share":
      return <SceneLinkShare reduced={reduced} />
    case "form-fill":
      return <SceneFormFill reduced={reduced} />
    case "notification":
      return <SceneNotification reduced={reduced} />
    case "room-update":
      return <SceneRoomUpdate reduced={reduced} />
    case "reminder":
      return <SceneReminder reduced={reduced} />
    default:
      return null
  }
}

/* ─── Main component ─────────────────────────────────────────── */

export function SceneExplainer() {
  const reduced = useReducedMotion() ?? false
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Touch/swipe state
  const touchStartX = useRef<number | null>(null)
  const touchPaused = useRef(false)

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % SCENES.length)
  }, [])

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
  }, [])

  useEffect(() => {
    if (paused || reduced) return
    timerRef.current = setInterval(advance, DURATION)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, reduced, advance])

  const scene = SCENES[current]

  const slideVariants = {
    enter: { opacity: 0, x: 32 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -32 },
  }

  return (
    <div
      className="lp-explainer"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
        touchPaused.current = true
        setPaused(true)
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchStartX.current ?? 0)
        if (Math.abs(dx) > 40) {
          if (dx < 0) setCurrent((c) => (c + 1) % SCENES.length)
          else setCurrent((c) => (c - 1 + SCENES.length) % SCENES.length)
        }
        touchPaused.current = false
        setTimeout(() => setPaused(false), 1500)
      }}
    >
      {/* Progress bar */}
      <div className="lp-progress-bar-track">
        <motion.div
          className="lp-progress-bar-fill"
          key={current}
          initial={{ scaleX: 0 }}
          animate={paused || reduced ? { scaleX: 0 } : { scaleX: 1 }}
          transition={{ duration: DURATION / 1000, ease: "linear" }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Visual area */}
      <div className="lp-scene-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="lp-scene-inner"
            variants={reduced ? {} : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            {renderVisual(scene.visual, reduced)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption */}
      <AnimatePresence mode="wait">
        <motion.p
          key={current}
          className="lp-scene-caption"
          initial={reduced ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
        >
          <span className="lp-scene-num">{current + 1}/{SCENES.length}</span>
          {scene.caption}
        </motion.p>
      </AnimatePresence>

      {/* Dot navigation */}
      <div className="lp-dots" role="tablist" aria-label="Pilih scene">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === current}
            aria-label={`Scene ${i + 1}: ${s.caption}`}
            className={`lp-dot ${i === current ? "lp-dot-active" : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
