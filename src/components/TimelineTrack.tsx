import { HoverCard, HoverCardTrigger, HoverCardContent } from './ui/hover-card'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

export type Marker = {
  value: number
  color?: string
  showLabel?: boolean
  label?: string
  title?: string
  data?: any
}

type Props = {
  /** Controlled current value (optional). If omitted, the component manages its own value. */
  value?: number
  /** Called whenever the user clicks the track to pick a new value. */
  onChange?: (next: number | undefined) => void

  start: number
  end: number
  markers: Marker[]

  /** Max pixels per value unit (same role as your `pixPerValue`). */
  pixPerValue: number

  /** Kept for parity with your Svelte signature; not used in this snippet. */
  selectMarker?: (markerIndex: number) => void

  /** Optional: set the track width (defaults to ~45vw like your CSS demo) */
  width?: number | string
  /** Optional: set the track height (defaults to 80) */
  height?: number
}

export const TimelineTrack: React.FC<Props> = ({
  value: controlledValue,
  onChange,
  start,
  end,
  markers,
  pixPerValue,
  // selectMarker,
  width = '100%',
  height = 80,
}) => {
  // Controlled/uncontrolled
  const [uncontrolledValue, setUncontrolledValue] = useState<number | undefined>(controlledValue)
  const isControlled = typeof controlledValue !== 'undefined'
  const value = isControlled ? controlledValue : uncontrolledValue

  useEffect(() => {
    if (isControlled) setUncontrolledValue(controlledValue)
  }, [controlledValue, isControlled])

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Track client rect with ResizeObserver for live ppv updates
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => setRect(el.getBoundingClientRect())
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)

    // Scroll could change scrollWidth vs visible width; keep rect fresh on scroll
    const onScroll = () => update()
    el.addEventListener('scroll', onScroll, { passive: true })

    // Also watch window resize just in case
    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Pixels-per-value logic (kept faithful to your Svelte code)
  const ppv = useMemo(() => {
    if (rect) {
      return Math.min((end - start) / rect.width, pixPerValue)
    } else {
      // console.log("no container");
      return pixPerValue
    }
  }, [rect, start, end, pixPerValue])

  // Conversions
  const xToValue = (x: number) => x * ppv + start
  const valueToX = (v: number) => (v - start) / ppv

  // Local X accounting for scrollLeft and clamping to scrollWidth
  const getLocalX = (e: React.MouseEvent) => {
    const el = containerRef.current!
    const r = el.getBoundingClientRect()
    const xVisible = e.clientX - r.left
    const x = xVisible + el.scrollLeft
    const clamped = Math.max(0, Math.min(x, el.scrollWidth))
    return clamped
  }

  const setValue = (next: number | undefined) => {
    if (!isControlled) setUncontrolledValue(next)
    onChange?.(next)
  }

  const handleClick = (e: React.MouseEvent) => {
    const x = getLocalX(e)
    setValue(xToValue(x))
  }

  // Content width mirrors your Svelte: width: valueToX(end - start) px
  // (Note: if you intended the full range width, you might want valueToX(end) instead.)
  const contentWidth = valueToX(end)

  // Basic styles (inline so it runs anywhere)
  const trackStyle: React.CSSProperties = {
    position: 'relative',
    height,
    border: '1px solid #ccc',
    background: '#fafafa',
    overflowX: 'auto',
    overflowY: 'hidden',
    width,
  }

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    height: '100%',
    width: `${contentWidth}px`,
  }

  const renderMarker = (xPx: number, marker: Marker) => {
    const markerStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      height: '100%',
      width: '2px',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      left: `${xPx}px`,
      background: marker.color ?? '#e11d48',
    }

    const labelStyle: React.CSSProperties = {
      position: 'absolute',
      top: 4,
      left: 6,
      fontFamily: 'system-ui, sans-serif',
      fontSize: 11,
      lineHeight: 1,
      color: '#555',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      userSelect: 'none',
    }

    return (
      <div key={`${marker.title}-${xPx}`} style={markerStyle} title={marker.title}>
        <HoverCard>
          <HoverCardTrigger>
            <span style={labelStyle}>{marker.label}</span>
          </HoverCardTrigger>
          <HoverCardContent>Tester {marker.title}</HoverCardContent>
        </HoverCard>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={trackStyle}
      onClick={handleClick}
      aria-label="Timeline track"
      role="slider"
      aria-valuemin={start}
      aria-valuemax={end}
      aria-valuenow={typeof value === 'number' ? Math.round(value) : undefined}
    >
      <div style={contentStyle}>
        {markers.map((marker) => {
          const x = valueToX(marker.value)
          if (0 <= x) {
            return renderMarker(x, marker)
          }
          return null
        })}

        {typeof value !== 'undefined' &&
          renderMarker(valueToX(value), {
            value,
            color: '#e11d48',
            title: `Current position: ${value.toFixed(2)}`,
            label: value.toFixed(2),
            showLabel: true,
          })}
      </div>
    </div>
  )
}
