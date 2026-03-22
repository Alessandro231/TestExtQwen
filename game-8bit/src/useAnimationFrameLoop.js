import { useEffect, useRef } from 'react'

export function useAnimationFrameLoop(enabled, onFrame) {
  const onFrameRef = useRef(onFrame)
  const animationIdRef = useRef(0)
  const runningRef = useRef(false)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!enabled) {
      runningRef.current = false
      lastTimeRef.current = 0
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = 0
      }
      return undefined
    }

    if (runningRef.current) return undefined
    runningRef.current = true

    const frame = (timestamp) => {
      if (!runningRef.current) return

      const prevTime = lastTimeRef.current
      const deltaTime = prevTime === 0 ? 16.67 : Math.min(100, timestamp - prevTime)
      lastTimeRef.current = timestamp

      onFrameRef.current(timestamp, deltaTime)
      animationIdRef.current = requestAnimationFrame(frame)
    }

    animationIdRef.current = requestAnimationFrame(frame)

    return () => {
      runningRef.current = false
      lastTimeRef.current = 0
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = 0
      }
    }
  }, [enabled])
}
