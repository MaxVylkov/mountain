'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import mountainRegionsData from '@/lib/data/mountain-regions.json'
import alpineCampsData from '@/lib/data/alpine-camps.json'
import federationsData from '@/lib/data/federations.json'

const { mountainRegions } = mountainRegionsData
const { alpineCamps } = alpineCampsData
const { federations } = federationsData

// Custom marker icons
function createIcon(color: string, size: number = 32) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: 3px solid rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
    "><svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M8 21l4-12 4 12M2 21h20M12 3l4 6H8l4-6z"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function createCampIcon() {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px; height: 24px;
      background: #F59E0B;
      border: 2px solid rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 21h18L12 3z"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

function createFederationIcon() {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 22px; height: 22px;
      background: #8B5CF6;
      border: 2px solid rgba(255,255,255,0.9);
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><span style="color:white;font-size:10px;font-weight:bold;">Ф</span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  })
}

const regionIcon = createIcon('#3B82F6', 36)
const campIcon = createCampIcon()
const federationIcon = createFederationIcon()

interface Mountain {
  id: string
  name: string
  region: string
  height: number
  latitude: number
  longitude: number
  routes?: { count: number }[]
  difficulty: number
}

function ZoomHandler({ showCamps, onZoomChange }: { showCamps: boolean; onZoomChange: (z: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = () => onZoomChange(map.getZoom())
    map.on('zoomend', handler)
    return () => { map.off('zoomend', handler) }
  }, [map, onZoomChange])
  return null
}

export default function AlpineMap({ mountains }: { mountains: Mountain[] }) {
  const [zoom, setZoom] = useState(4)
  const [showFederations, setShowFederations] = useState(false)
  const showCamps = zoom >= 7

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-mountain-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            Горные районы
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            Альплагеря {!showCamps && <span className="text-xs">(приблизьте)</span>}
          </span>
        </div>
        <button
          onClick={() => setShowFederations(!showFederations)}
          className={`text-sm px-3 py-1 rounded-full border transition-colors ${
            showFederations
              ? 'bg-purple-500/20 border-purple-500 text-purple-400'
              : 'border-mountain-border text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded inline-block ${showFederations ? 'bg-purple-500' : 'bg-mountain-border'}`} />
            Федерации
          </span>
        </button>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-mountain-border" style={{ height: '600px' }}>
        <MapContainer
          center={[55.0, 50.0]}
          zoom={4}
          style={{ height: '100%', width: '100%', background: '#0F1923' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomHandler showCamps={showCamps} onZoomChange={setZoom} />

          {/* Mountain Regions */}
          {mountainRegions.map((region: any) => (
            <Marker
              key={region.id}
              position={[region.mapCenter.lat, region.mapCenter.lng]}
              icon={regionIcon}
            >
              <Popup className="alpine-popup">
                <RegionPopup region={region} mountains={mountains} />
              </Popup>
            </Marker>
          ))}

          {/* Alpine Camps (visible on zoom >= 7) */}
          {showCamps && alpineCamps.map((camp: any) => (
            <Marker
              key={camp.id}
              position={[camp.coordinates.lat, camp.coordinates.lng]}
              icon={campIcon}
            >
              <Popup className="alpine-popup">
                <CampPopup camp={camp} />
              </Popup>
            </Marker>
          ))}

          {/* Federations layer */}
          {showFederations && federations.regional
            .filter((f: any) => f.coordinates)
            .map((fed: any) => (
              <Marker
                key={fed.id}
                position={[fed.coordinates.lat, fed.coordinates.lng]}
                icon={federationIcon}
              >
                <Popup className="alpine-popup">
                  <FederationPopup federation={fed} />
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      {/* ФАР info bar */}
      <div className="glass-card p-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
          <span className="text-mountain-muted">
            {federations.federal.nameShort} — {federations.federal.name}
          </span>
        </div>
        <a
          href={federations.federal.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-mountain-primary hover:underline"
        >
          {federations.federal.website.replace('https://', '').replace('www.', '')}
        </a>
      </div>
    </div>
  )
}

function RegionPopup({ region, mountains }: { region: any; mountains: Mountain[] }) {
  const linkedMountains = mountains.filter(m =>
    region.subRegions?.some((sr: string) =>
      m.region?.toLowerCase().includes(sr.toLowerCase()) ||
      m.name?.toLowerCase().includes(sr.toLowerCase())
    ) || m.region?.toLowerCase().includes(region.name.toLowerCase())
  )
  const totalRoutes = linkedMountains.reduce((sum, m) => sum + (m.routes?.[0]?.count || 0), 0)

  return (
    <div style={{ minWidth: 250, color: '#1a1a1a' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{region.name}</h3>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{region.description}</p>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 6 }}>
        <span>🏔 {region.highestPeak.name} ({region.highestPeak.altitude} м)</span>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 6 }}>
        <span>📅 {region.bestSeason}</span>
        <span>📏 {region.altitudeRange.min}–{region.altitudeRange.max} м</span>
      </div>
      {region.camps?.length > 0 && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
          Альплагеря: {region.camps.length}
        </div>
      )}
      {totalRoutes > 0 && (
        <div style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>
          {totalRoutes} маршрутов в базе
        </div>
      )}
    </div>
  )
}

function CampPopup({ camp }: { camp: any }) {
  return (
    <div style={{ minWidth: 260, color: '#1a1a1a' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{camp.fullName || camp.name}</h3>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{camp.subRegion} • {camp.altitude} м</p>
      <p style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>{camp.description?.slice(0, 150)}...</p>
      <div style={{ fontSize: 12, marginBottom: 4 }}>📅 Сезон: {camp.season}</div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>🧗 {camp.difficultyRange} • ~{camp.routeCount} маршрутов</div>
      {camp.howToGetThere && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>🚗 {camp.howToGetThere.slice(0, 100)}...</div>
      )}
      {camp.prices?.items?.[0] && (
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          💰 от {camp.prices.items[0].price.toLocaleString()} ₽ ({camp.prices.items[0].name})
        </div>
      )}
      {camp.website && (
        <a
          href={camp.website}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}
        >
          🌐 {camp.website.replace('https://', '').replace('www.', '')}
        </a>
      )}
    </div>
  )
}

function FederationPopup({ federation }: { federation: any }) {
  return (
    <div style={{ minWidth: 220, color: '#1a1a1a' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{federation.nameShort}</h3>
      <p style={{ fontSize: 13, color: '#444', marginBottom: 4 }}>{federation.name}</p>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{federation.region}</p>
      {federation.description && (
        <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{federation.description.slice(0, 120)}...</p>
      )}
      {federation.website && (
        <a
          href={federation.website}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}
        >
          🌐 {federation.website.replace('https://', '').replace('www.', '')}
        </a>
      )}
    </div>
  )
}
