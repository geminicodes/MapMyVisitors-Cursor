"use client"

 import { useEffect, useMemo, useRef, useState } from "react"
 import Script from "next/script"
 import { Loader2 } from "lucide-react"
 
 interface VisitorPoint {
   lat: number
   lng: number
   city: string
   country: string
   color: string
   altitude: number
   radius: number
   isRecent: boolean
   baseAltitude?: number
   avatarUrl?: string
 }
 
type VisitorPointWithIdx = VisitorPoint & {
  idx: number
  __element?: HTMLDivElement
}

type GlobePointOfView = { lat: number; lng: number; altitude: number }

interface GlobeControls {
  autoRotate: boolean
  autoRotateSpeed: number
}

interface GlobeCamera {
  position: { x: number; y: number; z: number }
}

interface GlobeRenderer {
  domElement?: HTMLElement
  dispose?: () => void
}

// Minimal surface-area typing for the globe.gl instance we use.
// globe.gl's runtime object is more complex; we only type what we call.
interface GlobeInstance {
  (el: HTMLElement): void

  width: (n: number) => GlobeInstance
  height: (n: number) => GlobeInstance
  globeImageUrl: (url: string) => GlobeInstance
  bumpImageUrl: (url: string) => GlobeInstance
  backgroundImageUrl: (url: string) => GlobeInstance
  atmosphereColor: (color: string) => GlobeInstance
  atmosphereAltitude: (n: number) => GlobeInstance
  showAtmosphere: (show: boolean) => GlobeInstance

  pointColor: (fn: (p: VisitorPointWithIdx) => string) => GlobeInstance
  pointAltitude: (fn: (p: VisitorPointWithIdx) => number) => GlobeInstance
  pointRadius: (fn: (p: VisitorPointWithIdx) => number) => GlobeInstance
  pointLabel: (fn: (p: VisitorPointWithIdx) => string) => GlobeInstance

  htmlElementsData: {
    (): VisitorPointWithIdx[] | undefined
    (data: VisitorPointWithIdx[]): GlobeInstance
  }
  htmlElement: (fn: (d: VisitorPointWithIdx) => HTMLElement) => GlobeInstance
  htmlLat: (fn: (d: VisitorPointWithIdx) => number) => GlobeInstance
  htmlLng: (fn: (d: VisitorPointWithIdx) => number) => GlobeInstance
  htmlAltitude: (fn: (d: VisitorPointWithIdx) => number) => GlobeInstance

  pointsData: {
    (): VisitorPointWithIdx[] | undefined
    (data: VisitorPointWithIdx[]): GlobeInstance
  }

  controls: () => GlobeControls
  camera: () => GlobeCamera
  renderer: () => GlobeRenderer
  pointOfView: (pov: GlobePointOfView, ms: number) => void
}

type GlobeFactory = () => GlobeInstance

declare global {
  interface Window {
    Globe?: GlobeFactory
  }
}

 export default function InteractiveGlobe() {
   const containerRef = useRef<HTMLDivElement>(null)
   const globeMountRef = useRef<HTMLDivElement>(null)
   const globeRef = useRef<GlobeInstance | null>(null)
   const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null)
   const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
   const mountedRef = useRef(true)
 
   const [isReady, setIsReady] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const [isMobile, setIsMobile] = useState(false)
   const [scriptReady, setScriptReady] = useState(false)
 
  // Demo visitor data - memoized to keep a stable reference (avoids hook dependency issues).
  const visitorPoints: VisitorPoint[] = useMemo(() => [
     // Recent visitors (pulsing blue)
     {
       lat: 37.7749,
       lng: -122.4194,
       city: "San Francisco",
       country: "United States",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=1",
     },
     {
       lat: 51.5074,
       lng: -0.1278,
       city: "London",
       country: "United Kingdom",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=2",
     },
     {
       lat: 35.6762,
       lng: 139.6503,
       city: "Tokyo",
       country: "Japan",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=3",
     },
     {
       lat: -33.8688,
       lng: 151.2093,
       city: "Sydney",
       country: "Australia",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=4",
     },
     {
       lat: 52.52,
       lng: 13.405,
       city: "Berlin",
       country: "Germany",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=5",
     },
     {
       lat: 48.8566,
       lng: 2.3522,
       city: "Paris",
       country: "France",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=6",
     },
     {
       lat: -23.5505,
       lng: -46.6333,
       city: "São Paulo",
       country: "Brazil",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=7",
     },
     {
       lat: 1.3521,
       lng: 103.8198,
       city: "Singapore",
       country: "Singapore",
       color: "#3b82f6",
       altitude: 0.08,
       radius: 0.5,
       isRecent: true,
       avatarUrl: "https://i.pravatar.cc/150?img=8",
     },
     {
       lat: 40.7128,
       lng: -74.006,
       city: "New York",
       country: "United States",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=9",
     },
     {
       lat: 19.076,
       lng: 72.8777,
       city: "Mumbai",
       country: "India",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=10",
     },
     {
       lat: 43.6532,
       lng: -79.3832,
       city: "Toronto",
       country: "Canada",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=11",
     },
     {
       lat: 25.2048,
       lng: 55.2708,
       city: "Dubai",
       country: "United Arab Emirates",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=12",
     },
     {
       lat: 55.7558,
       lng: 37.6173,
       city: "Moscow",
       country: "Russia",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=13",
     },
     {
       lat: 6.5244,
       lng: 3.3792,
       city: "Lagos",
       country: "Nigeria",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=14",
     },
     {
       lat: 19.4326,
       lng: -99.1332,
       city: "Mexico City",
       country: "Mexico",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=15",
     },
     {
       lat: 37.5665,
       lng: 126.978,
       city: "Seoul",
       country: "South Korea",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=16",
     },
     {
       lat: -34.6037,
       lng: -58.3816,
       city: "Buenos Aires",
       country: "Argentina",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=17",
     },
     {
       lat: 30.0444,
       lng: 31.2357,
       city: "Cairo",
       country: "Egypt",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=18",
     },
     {
       lat: 13.7563,
       lng: 100.5018,
       city: "Bangkok",
       country: "Thailand",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=19",
     },
     {
       lat: 41.0082,
       lng: 28.9784,
       city: "Istanbul",
       country: "Turkey",
       color: "#6b7280",
       altitude: 0.04,
       radius: 0.3,
       isRecent: false,
       avatarUrl: "https://i.pravatar.cc/150?img=20",
     },
  ], [])
 
   // Check mobile
   useEffect(() => {
     const checkMobile = () => {
       if (mountedRef.current) {
export default function InteractiveGlobe() {
   // Initialize globe
   useEffect(() => {
     mountedRef.current = true
 
    const globeMountEl = globeMountRef.current
    if (!globeMountEl || !scriptReady) {
       return
     }
 
     const initializeGlobe = async () => {
      if (!globeMountEl || !mountedRef.current) return
 
       try {
        if (!window.Globe) {
           throw new Error("Globe not found on window")
         }
 
        const Globe = (window as any).Globe
        const Globe: GlobeFactory = window.Globe
         const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
 
        const globe: GlobeInstance = Globe()
 
         globe
          .width(globeMountEl.clientWidth)
          .height(globeMountEl.clientHeight)
           .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
           .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
           .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
           .atmosphereColor("#3b82f6")
           .atmosphereAltitude(0.15)
           .showAtmosphere(true)
          .pointColor((p: VisitorPointWithIdx) => p.color)
          .pointAltitude((p: VisitorPointWithIdx) => p.altitude)
          .pointRadius((p: VisitorPointWithIdx) => p.radius)
          .pointLabel((p: VisitorPointWithIdx) => `${p.city}, ${p.country}`)
          .htmlElementsData(visitorPoints.map((point, idx) => ({ ...point, idx })))
          .htmlElement((d: VisitorPointWithIdx) => {
             const el = document.createElement('div')
             el.style.cssText = `
               width: 40px;
               height: 40px;
               border-radius: 50%;
               overflow: hidden;
               border: 3px solid ${d.isRecent ? '#3b82f6' : '#6b7280'};
               box-shadow: 0 0 ${d.isRecent ? '20px rgba(59, 130, 246, 0.8)' : '10px rgba(107, 114, 128, 0.5)'};
               background: #000;
               cursor: pointer;
               transition: transform 0.2s, box-shadow 0.2s, opacity 0.3s ease;
             `
 
             const img = document.createElement('img')
             img.src = d.avatarUrl || 'https://i.pravatar.cc/150?img=1'
             img.style.cssText = `
               width: 100%;
               height: 100%;
               object-fit: cover;
             `
             img.alt = `${d.city}, ${d.country}`
 
             el.appendChild(img)
 
             el.addEventListener('mouseenter', () => {
               el.style.transform = 'scale(1.2)'
               el.style.boxShadow = `0 0 30px ${d.isRecent ? 'rgba(59, 130, 246, 1)' : 'rgba(107, 114, 128, 0.8)'}`
             })
 
             el.addEventListener('mouseleave', () => {
               el.style.transform = 'scale(1)'
               el.style.boxShadow = `0 0 ${d.isRecent ? '20px rgba(59, 130, 246, 0.8)' : '10px rgba(107, 114, 128, 0.5)'}`
             })
 
             d.__element = el
 
             return el
           })
          .htmlLat((d: VisitorPointWithIdx) => d.lat)
          .htmlLng((d: VisitorPointWithIdx) => d.lng)
          .htmlAltitude((d: VisitorPointWithIdx) => d.altitude)
 
        globe(globeMountEl)
 
         globeRef.current = globe
 
         // Set initial camera position
         globe.pointOfView({ lat: 20, lng: -30, altitude: 2.5 }, 0)
export default function InteractiveGlobe() {
         // Configure points data
         const pointsData = visitorPoints.map((point, idx) => ({
           ...point,
           idx,
           baseAltitude: point.altitude,
        })) as VisitorPointWithIdx[]
 
         globe.pointsData(pointsData)
 
         // Setup controls
export default function InteractiveGlobe() {
           if (!mountedRef.current) return
 
           try {
             const controls = globe.controls()
export default function InteractiveGlobe() {
                 }, 3000)
               }
 
              globeMountEl.addEventListener("mousedown", onUserInteraction)
              globeMountEl.addEventListener("touchstart", onUserInteraction)
              globeMountEl.addEventListener("wheel", onUserInteraction)
             }
           } catch (err) {
             console.warn("Error accessing controls:", err)
           }
export default function InteractiveGlobe() {
         // Helper function to check if a point is visible from camera
         const isPointVisible = (lat: number, lng: number) => {
           try {
             const camera = globe.camera()
             if (!camera) return true
export default function InteractiveGlobe() {
 
             return dotProduct > 0.15
          } catch {
            return true
           }
         }
 
         // Setup pulse animation
export default function InteractiveGlobe() {
           pulseIntervalRef.current = setInterval(() => {
             if (!mountedRef.current) return
 
             pulseTime += 0.016
            const currentPointsData = globe.pointsData()
            const currentHtmlData = globe.htmlElementsData()
 
             if (currentPointsData && Array.isArray(currentPointsData)) {
              currentPointsData.forEach((point: VisitorPointWithIdx) => {
                 if (point.isRecent) {
                   const pulse = Math.sin(pulseTime * 3 + point.idx) * 0.04
                   point.altitude = (point.baseAltitude || point.altitude) + pulse
                 }
               })
 
              globe.pointAltitude((p: VisitorPointWithIdx) => p.altitude)
             }
 
             if (currentHtmlData && Array.isArray(currentHtmlData)) {
              currentHtmlData.forEach((point: VisitorPointWithIdx) => {
                 if (point.isRecent) {
                   const pulse = Math.sin(pulseTime * 3 + point.idx) * 0.04
                   point.altitude = (point.baseAltitude || point.altitude) + pulse
                 }
 
                 if (point.__element) {
                   const visible = isPointVisible(point.lat, point.lng)
                   point.__element.style.opacity = visible ? '1' : '0'
                   point.__element.style.pointerEvents = visible ? 'auto' : 'none'
                 }
               })
 
              globe.htmlAltitude((d: VisitorPointWithIdx) => d.altitude)
             }
           }, 16)
         }
 
         if (mountedRef.current) {
           setIsReady(true)
         }
       } catch (err) {
         if (mountedRef.current) {
           setError(err instanceof Error ? err.message : String(err))
         }
       }
     }
 
     // Initialize when script is ready
    if (window.Globe) {
       initializeGlobe()
     } else {
       setError("Globe library not loaded")
     }
 
     // Cleanup on unmount
     return () => {
       mountedRef.current = false
 
       // Clear timeouts and intervals
       if (pulseIntervalRef.current) {
         clearInterval(pulseIntervalRef.current)
         pulseIntervalRef.current = null
       }
       if (interactionTimeoutRef.current) {
         clearTimeout(interactionTimeoutRef.current)
         interactionTimeoutRef.current = null
       }
 
       // Cleanup globe instance
       if (globeRef.current) {
         try {
           // Try to access the renderer and dispose of it properly
           const renderer = globeRef.current.renderer()
           if (renderer && renderer.domElement && renderer.domElement.parentNode) {
             renderer.domElement.parentNode.removeChild(renderer.domElement)
           }
 
           // Dispose of the renderer
           if (renderer && typeof renderer.dispose === 'function') {
             renderer.dispose()
           }
 
           globeRef.current = null
         } catch (err) {
           console.warn("Error cleaning up globe:", err)
         }
       }
 
       // Clear the globe mount point
      if (globeMountEl) {
         try {
          while (globeMountEl.firstChild) {
            globeMountEl.removeChild(globeMountEl.firstChild)
           }
         } catch (err) {
           console.warn("Error clearing globe mount:", err)
         }
       }
     }
  }, [scriptReady, visitorPoints])
 
   return (
     <>
       <Script
         src="https://unpkg.com/globe.gl@2.31.0/dist/globe.gl.min.js"
export default function InteractiveGlobe() {
         onError={() => {
           setError("Failed to load globe.gl library")
         }}
       />
       <div className="w-full max-w-[600px] mx-auto">
       <div
         ref={containerRef}
         className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black"
         style={{
           boxShadow: "0 0 60px rgba(59, 130, 246, 0.3), 0 0 120px rgba(59, 130, 246, 0.15)",
           height: isMobile ? "400px" : "600px",
         }}
       >
         {/* Globe mount point - managed separately from React */}
         <div ref={globeMountRef} className="absolute inset-0" />
export default function InteractiveGlobe() {
       {/* Demo info */}
       <div className="mt-6 text-center">
         <p className="text-sm text-gray-600 dark:text-gray-400">
           {visitorPoints.filter((p) => p.isRecent).length} recent visitors •{" "}
           {visitorPoints.filter((p) => !p.isRecent).length} total locations
         </p>
       </div>
     </div>
     </>
   )
}
