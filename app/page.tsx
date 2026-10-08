"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  BellRing,
  LayoutDashboard,
  Bot,
  ShieldCheck,
  FileWarning,
  EyeOff,
  MessageSquareWarning,
  CheckCircle2,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { SceneExplainer } from "@/components/landing/scene-explainer"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import "@/app/landing.css"

/* ─── Data ───────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    icon: FileWarning,
    title: "Piutang tidak tercatat",
    desc: "Penyewa bilang sudah bayar, pemilik tidak punya bukti tertulis. Selisih angka baru ketahuan di akhir bulan.",
  },
  {
    icon: EyeOff,
    title: "Kamar kosong baru ketahuan belakangan",
    desc: "Penyewa pindah tanpa kabar, status kamar tidak diperbarui. Potensi pendapatan hilang diam-diam.",
  },
  {
    icon: MessageSquareWarning,
    title: "Penagihan jadi beban sosial",
    desc: "Mengingatkan bayar secara langsung terasa tidak enak. Relasi pemilik-penyewa jadi canggung.",
  },
]

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard Kamar Real-time",
    desc: "Lihat status tiap kamar — lunas, menunggu review, atau telat — dalam satu tampilan yang langsung diperbarui.",
  },
  {
    icon: BellRing,
    title: "Reminder Otomatis",
    desc: "Bot mengirim pengingat jatuh tempo setiap bulan. Tidak perlu menagih manual, tidak ada yang terlewat.",
  },
  {
    icon: Bot,
    title: "Bot Telegram & WhatsApp",
    desc: "Penyewa upload bukti transfer langsung lewat chat. Tidak perlu install aplikasi tambahan.",
  },
  {
    icon: ShieldCheck,
    title: "Verifikasi & Kepercayaan",
    desc: "Foto KTP, foto kamar, dan bukti transfer tersimpan rapi. Semua keputusan tetap ada di tangan pemilik.",
  },
]

const PRICING = [
  {
    tier: "Gratis",
    price: "Rp0",
    period: "",
    desc: "Untuk mencoba, selamanya",
    features: ["Hingga 3 kamar", "1 properti", "Dashboard dasar", "Bot Telegram (limited)"],
    cta: "Mulai gratis",
    featured: false,
  },
  {
    tier: "Starter",
    price: "Rp79.000",
    period: "/bln",
    desc: "Untuk pemilik kos kecil",
    features: ["Hingga 10 kamar", "1 properti", "Reminder otomatis", "Bot Telegram + WhatsApp", "Upload bukti penyewa"],
    cta: "Pilih Starter",
    featured: false,
  },
  {
    tier: "Growth",
    price: "Rp179.000",
    period: "/bln",
    desc: "Paling populer untuk kos aktif",
    features: ["Hingga 30 kamar", "3 properti", "Semua fitur Starter", "Laporan bulanan", "Prioritas support"],
    cta: "Pilih Growth",
    featured: true,
    badge: "Paling Populer",
  },
  {
    tier: "Pro",
    price: "Rp399.000",
    period: "/bln",
    desc: "Untuk portofolio besar",
    features: ["Kamar tak terbatas", "Properti tak terbatas", "Semua fitur Growth", "API akses", "Onboarding khusus"],
    cta: "Hubungi kami",
    featured: false,
  },
]

const HERO_ROWS = [
  { room: "Kamar 01", status: "Lunas", statusClass: "lp-hero-row-status-paid", amount: "Rp 1.850.000" },
  { room: "Kamar 05", status: "Menunggu", statusClass: "lp-hero-row-status-warn", amount: "Rp 1.650.000" },
  { room: "Kamar 08", status: "Telat 3 hari", statusClass: "lp-hero-row-status-late", amount: "Rp 1.500.000" },
]

/* ─── Page ───────────────────────────────────────────────────── */

export default function LandingPage() {
  const reduced = useReducedMotion()

  const heroContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : 0.12,
      },
    },
  }

  const heroItemVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduced ? 0 : 0.6,
        ease: "easeOut" as const,
      },
    },
  }

  const heroCardVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduced ? 0 : 0.7,
        delay: reduced ? 0 : 0.25,
        ease: "easeOut" as const,
      },
    },
  }

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <BotKosLogo
          size={30}
          textClassName="text-lg font-extrabold text-[#FCFBF9] tracking-tight"
        />
        <ul className="lp-nav-links">
          <li><a href="#masalah" className="lp-nav-link">Masalah</a></li>
          <li><a href="#cara-kerja" className="lp-nav-link">Cara Kerja</a></li>
          <li><a href="#fitur" className="lp-nav-link">Fitur</a></li>
          <li><a href="#harga" className="lp-nav-link">Harga</a></li>
        </ul>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/dashboard" className="lp-btn-ghost" style={{ padding: "0.55rem 0.9rem", fontSize: "0.82rem" }}>
            Masuk
          </Link>
          <Link href="/dashboard" className="lp-btn-primary" style={{ padding: "0.55rem 0.9rem", fontSize: "0.82rem" }}>
            Coba Gratis
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* Decorative blobs */}
        <div
          className="lp-blob lp-blob-gold"
          style={{ width: 600, height: 600, top: -200, left: -200 }}
        />
        <div
          className="lp-blob lp-blob-warm"
          style={{ width: 400, height: 400, bottom: -100, right: -100 }}
        />

        <div className="lp-container" style={{ width: "100%", position: "relative", zIndex: 1 }}>
          <div className="lp-hero-inner">
            {/* Left: copy */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroContainerVariants}
            >
              <motion.div
                className="lp-hero-badge"
                variants={heroItemVariants}
              >
                <span className="lp-hero-badge-dot" />
                Manajemen kos tanpa kerumitan
              </motion.div>

              <motion.h1
                className="lp-hero-headline"
                variants={heroItemVariants}
              >
                Tahu siapa sudah bayar.<br />
                <em>Tanpa perlu tanya.</em>
              </motion.h1>

              <motion.p
                className="lp-hero-sub"
                variants={heroItemVariants}
              >
                BotKos merapikan kamar, jatuh tempo, dan bukti transfer
                dalam satu tempat — otomatis, tanpa aplikasi rumit untuk penyewa.
              </motion.p>

              <motion.div
                className="lp-hero-ctas"
                variants={heroItemVariants}
              >
                <Link href="/dashboard" className="lp-btn-primary">
                  Coba Gratis <ArrowUpRight size={16} />
                </Link>
                <a href="#cara-kerja" className="lp-btn-ghost">
                  Lihat cara kerjanya
                </a>
              </motion.div>

              <motion.p
                variants={heroItemVariants}
                style={{ marginTop: "1rem", fontSize: "0.78rem", color: "rgba(252,251,249,0.35)" }}
              >
                Gratis untuk 3 kamar pertama. Tidak perlu kartu kredit.
              </motion.p>
            </motion.div>

            {/* Right: hero card */}
            <motion.div
              className="lp-hero-visual"
              initial="hidden"
              animate="visible"
              variants={heroCardVariants}
            >
              <div className="lp-hero-card">
                <div className="lp-hero-card-label">Kas bulan ini</div>
                <div className="lp-hero-card-amount">Rp 18.450.000</div>
                <div className="lp-hero-card-rows">
                  {HERO_ROWS.map((row) => (
                    <div key={row.room} className="lp-hero-row">
                      <span className="lp-hero-row-room">{row.room}</span>
                      <span className={row.statusClass}>{row.status}</span>
                      <span className="lp-hero-row-amount">{row.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating notification badge */}
              <div className="lp-hero-float-badge">
                <div className="lp-float-icon">
                  <CheckCircle2 size={16} />
                </div>
                <div className="lp-float-text">
                  <div className="lp-float-title">Pembayaran masuk</div>
                  <div className="lp-float-sub">Kamar 03 · Rp 1.800.000</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Problems ── */}
      <section id="masalah" className="lp-section" style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="lp-container">
          <ScrollReveal>
            <span className="lp-eyebrow">Kenapa perlu BotKos?</span>
            <h2 className="lp-section-title">
              Masalah kos yang sama,<br /> berulang tiap bulan
            </h2>
            <p className="lp-section-sub">
              Bukan karena penyewa nakal — tapi karena prosesnya memang belum punya sistem yang jelas.
            </p>
          </ScrollReveal>

          <div className="lp-problems-grid">
            {PROBLEMS.map((p, i) => (
              <ScrollReveal key={p.title} delay={0.1 + i * 0.12}>
                <div className="lp-problem-card">
                  <div className="lp-problem-icon">
                    <p.icon size={18} />
                  </div>
                  <h3 className="lp-problem-title">{p.title}</h3>
                  <p className="lp-problem-desc">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scene Explainer ── */}
      <section id="cara-kerja" className="lp-section">
        <div className="lp-container">
          <div className="lp-explainer-wrap">
            {/* Left: copy */}
            <div>
              <ScrollReveal>
                <span className="lp-eyebrow">Cara kerja</span>
                <h2 className="lp-section-title">
                  Dari link ke kas,<br /> dalam hitungan menit
                </h2>
                <p className="lp-section-sub">
                  Penyewa tidak perlu download aplikasi. Pemilik tidak perlu mengejar satu per satu.
                  Semua jalan otomatis lewat chat yang sudah mereka pakai sehari-hari.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.15}>
                <ul style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none", padding: 0 }}>
                  {[
                    "Satu link unik per kamar",
                    "Penyewa isi form & upload sendiri",
                    "Notifikasi langsung ke pemilik",
                    "Kamar otomatis ter-update",
                  ].map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "rgba(252,251,249,0.65)" }}>
                      <CheckCircle2 size={15} style={{ color: "#5FB88A", flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            </div>

            {/* Right: animated scene player */}
            <ScrollReveal delay={0.1}>
              <SceneExplainer />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fitur" className="lp-section" style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="lp-container">
          <ScrollReveal>
            <span className="lp-eyebrow">Fitur utama</span>
            <h2 className="lp-section-title">Semua yang dibutuhkan pemilik kos</h2>
            <p className="lp-section-sub">
              Dibangun khusus untuk pemilik kos Indonesia — bukan alat akuntansi rumit, bukan spreadsheet.
            </p>
          </ScrollReveal>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={0.1 + i * 0.1}>
                <div className="lp-feature-card">
                  <div className="lp-feature-icon">
                    <f.icon size={20} />
                  </div>
                  <h3 className="lp-feature-title">{f.title}</h3>
                  <p className="lp-feature-desc">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="harga" className="lp-section">
        <div className="lp-container">
          <ScrollReveal>
            <div style={{ textAlign: "center" }}>
              <span className="lp-eyebrow">Harga</span>
              <h2 className="lp-section-title">Transparan dari awal</h2>
              <p className="lp-section-sub" style={{ marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
                Mulai gratis, upgrade sesuai kebutuhan. Tidak ada biaya tersembunyi.
              </p>
            </div>
          </ScrollReveal>

          <div className="lp-pricing-grid">
            {PRICING.map((plan, i) => (
              <ScrollReveal key={plan.tier} delay={0.1 + i * 0.1}>
                <div className={`lp-pricing-card ${plan.featured ? "lp-pricing-card-featured" : ""}`}>
                  {plan.badge && (
                    <div className="lp-pricing-badge">{plan.badge}</div>
                  )}
                  <div className="lp-pricing-tier">{plan.tier}</div>
                  <div className="lp-pricing-price">
                    {plan.price}
                    {plan.period && <span>{plan.period}</span>}
                  </div>
                  <div className="lp-pricing-desc">{plan.desc}</div>
                  <div className="lp-pricing-divider" />
                  <ul className="lp-pricing-features">
                    {plan.features.map((feat) => (
                      <li key={feat} className="lp-pricing-feature-item">{feat}</li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard"
                    className={`lp-pricing-cta ${plan.featured ? "lp-pricing-cta-featured" : "lp-pricing-cta-ghost"}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-glow" />
        <div className="lp-container">
          <div className="lp-cta-inner">
            <ScrollReveal>
              <h2 className="lp-cta-title">
                Mulai sekarang,<br />
                <em>gratis selamanya</em> untuk 3 kamar
              </h2>
              <p className="lp-cta-sub">
                Tidak perlu kartu kredit. Tidak perlu penyewa install aplikasi.
                Siap dalam 5 menit.
              </p>
              <div className="lp-cta-actions">
                <Link href="/dashboard" className="lp-btn-primary">
                  Buat akun gratis <ArrowUpRight size={16} />
                </Link>
                <a href="#cara-kerja" className="lp-btn-ghost">
                  Pelajari lebih lanjut
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-container">
        <div className="lp-footer">
          <div className="lp-footer-left">
            © 2026 BotKos · botkos.id · Operasional kos otomatis tanpa istilah rumit
          </div>
          <div className="lp-footer-links">
            <a href="#" className="lp-footer-link">Kebijakan Privasi</a>
            <a href="#" className="lp-footer-link">Syarat Layanan</a>
          </div>
          <div className="lp-footer-right">v0.1 / stage 1</div>
        </div>
      </footer>
    </div>
  )
}
