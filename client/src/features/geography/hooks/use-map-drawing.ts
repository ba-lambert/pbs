import { useMemo, useState } from 'react'
import type { LatLngTuple } from 'leaflet'
import type { DrawingMode } from '../types/geography'
import { DRAWING_MIN_POINTS } from '../types/geography'

interface ParsedGeometry {
  kind: 'polygon' | 'line'
  positions: LatLngTuple[]
}

function normalizeWkt(wkt: string) {
  return wkt.trim().replace(/\s+/g, ' ')
}

function parsePositionPairs(value: string): LatLngTuple[] {
  return value
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [lngText, latText] = pair.split(/\s+/)
      const lng = Number(lngText)
      const lat = Number(latText)
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return null
      }
      return [lat, lng] as LatLngTuple
    })
    .filter((point): point is LatLngTuple => point !== null)
}

export function parseGeometryWkt(wkt: string): ParsedGeometry | null {
  const normalized = normalizeWkt(wkt)
  const polygonMatch = normalized.match(/^POLYGON\s*\(\(\s*(.+)\s*\)\)$/i)
  if (polygonMatch) {
    const points = parsePositionPairs(polygonMatch[1])
    if (points.length < 3) return null

    const [firstLat, firstLng] = points[0]
    const [lastLat, lastLng] = points[points.length - 1]
    const shouldDropLast = firstLat === lastLat && firstLng === lastLng

    return {
      kind: 'polygon',
      positions: shouldDropLast ? points.slice(0, -1) : points,
    }
  }

  const lineMatch = normalized.match(/^LINESTRING\s*\(\s*(.+)\s*\)$/i)
  if (lineMatch) {
    const points = parsePositionPairs(lineMatch[1])
    if (points.length < 2) return null

    return {
      kind: 'line',
      positions: points,
    }
  }

  return null
}

function toPair([lat, lng]: LatLngTuple) {
  const round = (value: number) => Number(value.toFixed(6))
  return `${round(lng)} ${round(lat)}`
}

function verticesToWkt(mode: DrawingMode, vertices: LatLngTuple[]) {
  if (mode === 'route') {
    return `LINESTRING(${vertices.map(toPair).join(', ')})`
  }

  const closed = [...vertices, vertices[0]]
  return `POLYGON((${closed.map(toPair).join(', ')}))`
}

export function useMapDrawing(initialMode: DrawingMode = 'stop') {
  const [mode, setModeState] = useState<DrawingMode>(initialMode)
  const [vertices, setVertices] = useState<LatLngTuple[]>([])

  const setMode = (nextMode: DrawingMode) => {
    setModeState(nextMode)
    setVertices([])
  }

  const addVertex = (point: LatLngTuple) => {
    setVertices((current) => [...current, point])
  }

  const resetDrawing = () => {
    setVertices([])
  }

  const undoLastVertex = () => {
    setVertices((current) => current.slice(0, -1))
  }

  const minPoints = DRAWING_MIN_POINTS[mode]
  const canComplete = vertices.length >= minPoints
  const canUndo = vertices.length > 0

  const completeDrawing = () => {
    if (!canComplete) return null
    return verticesToWkt(mode, vertices)
  }

  const previewWkt = useMemo(() => {
    if (!canComplete) {
      return null
    }
    return verticesToWkt(mode, vertices)
  }, [canComplete, mode, vertices])

  return {
    mode,
    setMode,
    vertices,
    addVertex,
    resetDrawing,
    undoLastVertex,
    completeDrawing,
    canComplete,
    canUndo,
    previewWkt,
  }
}
