"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

type DottedGlowBackgroundProps = {
  className?: string
  /** distance between dot centers in pixels */
  gap?: number
  /** base radius of each dot in CSS px */
  radius?: number
  /** dot color (will pulse by alpha) */
  color?: string
  /** optional dot color for dark mode */
  darkColor?: string
  /** shadow/glow color for bright dots */
  glowColor?: string
  /** optional glow color for dark mode */
  darkGlowColor?: string
  /** optional CSS variable name for light dot color (e.g. --color-zinc-900) */
  colorLightVar?: string
  /** optional CSS variable name for dark dot color (e.g. --color-zinc-100) */
  colorDarkVar?: string
  /** optional CSS variable name for light glow color */
  glowColorLightVar?: string
  /** optional CSS variable name for dark glow color */
  glowColorDarkVar?: string
  /** global opacity for the whole layer */
  opacity?: number
  /** background radial fade opacity (0 = transparent background) */
  backgroundOpacity?: number
  /** minimum per-dot speed in rad/s */
  speedMin?: number
  /** maximum per-dot speed in rad/s */
  speedMax?: number
  /** global speed multiplier for all dots */
  speedScale?: number
}

/**
 * Canvas-based dotted background that randomly glows and dims.
 * - Uses a stable grid of dots.
 * - Each dot gets its own phase + speed producing organic shimmering.
 * - Handles high-DPI and resizes via ResizeObserver.
 */
export const DottedGlowBackground = ({
  className,
  gap = 12,
  radius = 2,
  color = "rgba(0,0,0,0.7)",
  darkColor,
  glowColor = "rgba(0, 170, 255, 0.85)",
  darkGlowColor,
  colorLightVar,
  colorDarkVar,
  glowColorLightVar,
  glowColorDarkVar,
  opacity = 0.6,
  backgroundOpacity = 0,
  speedMin = 0.4,
  speedMax = 1.3,
  speedScale = 1,
}: DottedGlowBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [resolvedColor, setResolvedColor] = useState<string>(color)
  const [resolvedGlowColor, setResolvedGlowColor] = useState<string>(glowColor)

  // Resolve CSS variable value from the container or root
  const resolveCssVariable = (el: Element, variableName?: string): string | null => {
    if (!variableName) return null
    const normalized = variableName.startsWith("--") ? variableName : `--${variableName}`
    const fromEl = getComputedStyle(el as Element)
      .getPropertyValue(normalized)
      .trim()
    if (fromEl) return fromEl
    const root = document.documentElement
    const fromRoot = getComputedStyle(root).getPropertyValue(normalized).trim()
    return fromRoot || null
  }

  const detectDarkMode = (): boolean => {
    const root = document.documentElement
    if (root.classList.contains("dark")) return true
    if (root.classList.contains("light")) return false
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  }

  // Keep resolved colors in sync with theme changes and prop updates
  useEffect(() => {
    const container = containerRef.current ?? document.documentElement

    const compute = () => {
      const isDark = detectDarkMode()

      let nextColor: string = color
      let nextGlow: string = glowColor

      if (isDark) {
        const varDot = resolveCssVariable(container, colorDarkVar)
        const varGlow = resolveCssVariable(container, glowColorDarkVar)
        nextColor = varDot || darkColor || nextColor
        nextGlow = varGlow || darkGlowColor || nextGlow
      } else {
        const varDot = resolveCssVariable(container, colorLightVar)
        const varGlow = resolveCssVariable(container, glowColorLightVar)
        nextColor = varDot || nextColor
        nextGlow = varGlow || nextGlow
      }

      setResolvedColor(nextColor)
      setResolvedGlowColor(nextGlow)
    }

    compute()

    const mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null
    const handleMql = () => compute()
    mql?.addEventListener?.("change", handleMql)

    // Debounce MutationObserver to prevent excessive recomputation
    const debouncedCompute = debounce(compute, 100)
    const mo = new MutationObserver(debouncedCompute)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      mql?.removeEventListener?.("change", handleMql)
      mo.disconnect()
    }
  }, [color, darkColor, glowColor, darkGlowColor, colorLightVar, colorDarkVar, glowColorLightVar, glowColorDarkVar])

  useEffect(() => {
    const el = canvasRef.current
    const container = containerRef.current
    if (!el || !container) return

    const ctx = el.getContext("2d", { alpha: true })
    if (!ctx) return

    let raf = 0
    let stopped = false
    let paused = document.hidden

    // Target 30fps for smooth animation (33ms between frames)
    const FRAME_INTERVAL = 33
    let lastFrame = 0

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

    // Cache dimensions to avoid getBoundingClientRect every frame
    let cachedWidth = 0
    let cachedHeight = 0

    const resize = () => {
      const rect = container.getBoundingClientRect()
      cachedWidth = rect.width
      cachedHeight = rect.height
      el.width = Math.max(1, Math.floor(cachedWidth * dpr))
      el.height = Math.max(1, Math.floor(cachedHeight * dpr))
      el.style.width = `${Math.floor(cachedWidth)}px`
      el.style.height = `${Math.floor(cachedHeight)}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    // Precompute dot data - use larger gap on bigger screens
    let dots: { x: number; y: number; phase: number; speed: number }[] = []

    const regenDots = () => {
      dots = []
      // Increase gap on larger screens to reduce dot count
      const effectiveGap = cachedWidth > 1200 ? gap * 1.5 : gap
      const cols = Math.ceil(cachedWidth / effectiveGap) + 2
      const rows = Math.ceil(cachedHeight / effectiveGap) + 2
      const min = Math.min(speedMin, speedMax)
      const max = Math.max(speedMin, speedMax)
      const span = Math.max(max - min, 0)

      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          dots.push({
            x: i * effectiveGap + (j % 2 === 0 ? 0 : effectiveGap * 0.5),
            y: j * effectiveGap,
            phase: Math.random() * Math.PI * 2,
            speed: min + Math.random() * span,
          })
        }
      }
    }

    regenDots()

    const draw = (now: number) => {
      if (stopped) return

      raf = requestAnimationFrame(draw)

      // Skip if paused or not enough time elapsed (throttle to ~15fps)
      if (paused || now - lastFrame < FRAME_INTERVAL) return
      lastFrame = now

      ctx.clearRect(0, 0, el.width, el.height)

      // Skip background gradient if not needed
      if (backgroundOpacity > 0) {
        const grad = ctx.createRadialGradient(
          cachedWidth * 0.5, cachedHeight * 0.4,
          Math.min(cachedWidth, cachedHeight) * 0.1,
          cachedWidth * 0.5, cachedHeight * 0.5,
          Math.max(cachedWidth, cachedHeight) * 0.7
        )
        grad.addColorStop(0, "rgba(0,0,0,0)")
        grad.addColorStop(1, `rgba(0,0,0,${backgroundOpacity})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, cachedWidth, cachedHeight)
      }

      ctx.fillStyle = resolvedColor
      const time = (now / 1000) * Math.max(speedScale, 0)
      const baseOpacity = opacity

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        const mod = (time * d.speed + d.phase) % 2
        const a = 0.25 + 0.55 * (mod < 1 ? mod : 2 - mod)

        ctx.globalAlpha = a * baseOpacity
        ctx.beginPath()
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const handleResize = debounce(() => {
      resize()
      regenDots()
    }, 150)

    const handleVisibility = () => {
      paused = document.hidden
    }

    window.addEventListener("resize", handleResize)
    document.addEventListener("visibilitychange", handleVisibility)
    raf = requestAnimationFrame(draw)

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("visibilitychange", handleVisibility)
      ro.disconnect()
    }
  }, [gap, radius, resolvedColor, resolvedGlowColor, opacity, backgroundOpacity, speedMin, speedMax, speedScale])

  return (
    <div ref={containerRef} className={className} style={{ position: "absolute", inset: 0 }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
