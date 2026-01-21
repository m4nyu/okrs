"use client"

import { useState, useEffect, useCallback } from "react"

const okrFacts = [
  "OKRs (Objectives and Key Results) are a goal-setting framework used by companies like Google, Intel, and Spotify to align teams and drive measurable outcomes.",
  "A good Objective is qualitative, ambitious, and time-bound. It answers: 'Where do I want to go?'",
  "Key Results are quantitative metrics that measure progress toward your Objective. They answer: 'How do I know I'm getting there?'",
  "If you're consistently hitting 100% of your OKRs, they're not ambitious enough. Aim for 70% completion.",
  "The sweet spot is 3-5 Key Results per Objective. Too few won't capture the full picture, too many creates confusion.",
  "Limit yourself to 3-5 Objectives per quarter. More than that dilutes focus.",
  "Key Results should describe outcomes, not activities. Not 'Launch 3 campaigns' but 'Increase traffic by 50%'.",
  "Review your OKRs weekly or bi-weekly. This keeps them top of mind and allows for course correction."
]

export default function Loading() {
  const [factIndex, setFactIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [isStreaming, setIsStreaming] = useState(true)
  const [opacity, setOpacity] = useState(1)
  const [done, setDone] = useState(false)

  const currentFact = okrFacts[factIndex]

  // Calculate reading time: ~200 words per minute, minimum 1.5s
  const getReadingTime = useCallback((text: string) => {
    const words = text.split(" ").length
    const time = (words / 200) * 60 * 1000
    return Math.max(1500, time)
  }, [])

  useEffect(() => {
    if (done) return

    let charIndex = 0
    setDisplayedText("")
    setIsStreaming(true)
    setOpacity(1)

    // Stream text character by character
    const streamInterval = setInterval(() => {
      if (charIndex < currentFact.length) {
        setDisplayedText(currentFact.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(streamInterval)
        setIsStreaming(false)

        // Wait for reading time, then fade out
        const readingTime = getReadingTime(currentFact)
        setTimeout(() => {
          setOpacity(0)
          // After fade, move to next fact or finish
          setTimeout(() => {
            if (factIndex < okrFacts.length - 1) {
              setFactIndex(i => i + 1)
            } else {
              setDone(true)
            }
          }, 500)
        }, readingTime)
      }
    }, 20)

    return () => clearInterval(streamInterval)
  }, [factIndex, currentFact, getReadingTime, done])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <p
        className="max-w-lg text-center text-muted-foreground text-sm leading-relaxed transition-opacity duration-500"
        style={{ opacity }}
      >
        {displayedText}
        {isStreaming && <span className="animate-pulse">|</span>}
      </p>
    </div>
  )
}
