import Image from "next/image"

type BotKosLogoProps = {
  className?: string
  size?: number
  showText?: boolean
  textClassName?: string
}

export function BotKosLogo({
  className = "",
  size = 28,
  showText = true,
  textClassName = "text-base font-extrabold text-[var(--ink)] tracking-tight",
}: BotKosLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/BotKos-Logo.png"
        alt="BotKos Logo"
        width={size}
        height={size}
        className="object-contain shrink-0 rounded-md"
        priority
      />
      {showText && <span className={textClassName}>BotKos</span>}
    </div>
  )
}
