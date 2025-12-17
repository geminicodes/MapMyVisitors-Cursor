'use client';
 
import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
 
interface VisitorPoint {
  lat: number;
  lng: number;
  city: string;
  country: string;
  color: string;
  altitude: number;
  radius: number;
  isRecent: boolean;
  baseAltitude?: number;
  avatarUrl?: string;
}
 
type VisitorPointWithIdx = VisitorPoint & {
  idx: number;
  __element?: HTMLDivElement;
};
 
type GlobePointOfView = { lat: number; lng: number; altitude: number };
 
interface GlobeControls {
  autoRotate: boolean;
  autoRotateSpeed: number;
}
 
interface GlobeCamera {
  position: { x: number; y: number; z: number };
}
 
interface GlobeRenderer {
  domElement?: HTMLElement;
  dispose?: () => void;
}
 
interface GlobeInstance {
  (el: HTMLElement): void;
 
  width: (n: number) => GlobeInstance;
  height: (n: number) => GlobeInstance;
  globeImageUrl: (url: string) => GlobeInstance;
  bumpImageUrl: (url: string) => GlobeInstance;
  backgroundImageUrl: (url: string) => GlobeInstance;
  atmosphereColor: (color: string) => GlobeInstance;
  atmosphereAltitude: (n: number) => GlobeInstance;
  showAtmosphere: (show: boolean) => GlobeInstance;
 
  pointColor: (fn: (p: VisitorPointWithIdx) => string) => GlobeInstance;
  pointAltitude: (fn: (p: VisitorPointWithIdx) => number) => GlobeInstance;
  pointRadius: (fn: (p: VisitorPointWithIdx) => number) => GlobeInstance;
  pointLabel: (fn: (p: VisitorPointWithIdx) => string) => GlobeInstance;
 
  htmlElementsData: {
    (): VisitorPointWithIdx[] | undefined;
    (data: VisitorPointWithIdx[]): GlobeInstance;
  };
  htmlElement: (fn: (d: VisitorPointWithIdx) => HTMLElement) => GlobeInstance;
  htmlLat: (fn: (d: VisitorPointWithIdx) => number) => GlobeInstance;
  htmlLng: (fn: (d: VisitorPointWithIdx) => number) => GlobeInstance;
  htmlAltitude: (fn: (d: VisitorPointWithIdx) => number) => GlobeInstance;
 
  pointsData: {
    (): VisitorPointWithIdx[] | undefined;
    (data: VisitorPointWithIdx[]): GlobeInstance;
  };
 
  controls: () => GlobeControls;
  camera: () => GlobeCamera;
  renderer: () => GlobeRenderer;
  pointOfView: (pov: GlobePointOfView, ms: number) => void;
}
 
type GlobeFactory = () => GlobeInstance;
 
declare global {
  interface Window {
    Globe?: GlobeFactory;
  }
}
 
export default function DemoGlobe() {
  const globeMountRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
 
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
 
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
 
  const visitorPoints: VisitorPoint[] = useMemo(
    () => [
      { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'United States', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=1' },
      { lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=2' },
      { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=3' },
      { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=4' },
      { lat: 52.52, lng: 13.405, city: 'Berlin', country: 'Germany', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=5' },
      { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=6' },
      { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=7' },
      { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore', color: '#3b82f6', altitude: 0.08, radius: 0.5, isRecent: true, avatarUrl: 'https://i.pravatar.cc/150?img=8' },
 
      { lat: 40.7128, lng: -74.006, city: 'New York', country: 'United States', color: '#6b7280', altitude: 0.04, radius: 0.3, isRecent: false, avatarUrl: 'https://i.pravatar.cc/150?img=9' },
      { lat: 19.076, lng: 72.8777, city: 'Mumbai', country: 'India', color: '#6b7280', altitude: 0.04, radius: 0.3, isRecent: false, avatarUrl: 'https://i.pravatar.cc/150?img=10' },
    ],
    []
  );
 
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
 
  useEffect(() => {
    mountedRef.current = true;
 
    const globeMountEl = globeMountRef.current;
    if (!globeMountEl || !scriptReady) return;
 
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 
    const onUserInteraction = () => {
      const globe = globeRef.current;
      if (!globe || prefersReducedMotion) return;
 
      try {
        const controls = globe.controls();
        controls.autoRotate = false;
 
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          const g = globeRef.current;
          if (!g) return;
          try {
            g.controls().autoRotate = true;
          } catch {
            // ignore
          }
        }, 3000);
      } catch {
        // ignore
      }
    };
 
    const isPointVisible = (globe: GlobeInstance, lat: number, lng: number): boolean => {
      try {
        const camera = globe.camera();
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
 
        const pointX = Math.sin(phi) * Math.cos(theta);
        const pointY = Math.cos(phi);
        const pointZ = Math.sin(phi) * Math.sin(theta);
 
        const camPos = camera.position;
        const distance = Math.sqrt(camPos.x * camPos.x + camPos.y * camPos.y + camPos.z * camPos.z);
        const camX = camPos.x / distance;
        const camY = camPos.y / distance;
        const camZ = camPos.z / distance;
 
        const dotProduct = pointX * camX + pointY * camY + pointZ * camZ;
        return dotProduct > 0.15;
      } catch {
        return true;
      }
    };
 
    const init = () => {
      try {
        if (!window.Globe) throw new Error('Globe not found on window');
 
        const Globe = window.Globe;
        const globe = Globe();
 
        const htmlData = visitorPoints.map((p, idx) => ({ ...p, idx })) as VisitorPointWithIdx[];
 
        globe
          .width(globeMountEl.clientWidth)
          .height(globeMountEl.clientHeight)
          .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
          .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
          .atmosphereColor('#3b82f6')
          .atmosphereAltitude(0.15)
          .showAtmosphere(true)
          .pointColor((p) => p.color)
          .pointAltitude((p) => p.altitude)
          .pointRadius((p) => p.radius)
          .pointLabel((p) => `${p.city}, ${p.country}`)
          .htmlElementsData(htmlData)
          .htmlElement((d) => {
            const el = document.createElement('div');
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
            `;
 
            const img = document.createElement('img');
            img.src = d.avatarUrl || 'https://i.pravatar.cc/150?img=1';
            img.alt = `${d.city}, ${d.country}`;
            img.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
            `;
            el.appendChild(img);
 
            el.addEventListener('mouseenter', () => {
              el.style.transform = 'scale(1.2)';
              el.style.boxShadow = `0 0 30px ${d.isRecent ? 'rgba(59, 130, 246, 1)' : 'rgba(107, 114, 128, 0.8)'}`;
            });
            el.addEventListener('mouseleave', () => {
              el.style.transform = 'scale(1)';
              el.style.boxShadow = `0 0 ${d.isRecent ? '20px rgba(59, 130, 246, 0.8)' : '10px rgba(107, 114, 128, 0.5)'}`;
            });
 
            d.__element = el;
            return el;
          })
          .htmlLat((d) => d.lat)
          .htmlLng((d) => d.lng)
          .htmlAltitude((d) => d.altitude);
 
        globe(globeMountEl);
 
        const pointsData = visitorPoints.map((p, idx) => ({ ...p, idx, baseAltitude: p.altitude })) as VisitorPointWithIdx[];
        globe.pointsData(pointsData);
 
        globeRef.current = globe;
 
        globe.pointOfView({ lat: 20, lng: -30, altitude: 2.5 }, 0);
 
        try {
          const controls = globe.controls();
          if (!prefersReducedMotion) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
          }
        } catch {
          // ignore
        }
 
        globeMountEl.addEventListener('mousedown', onUserInteraction);
        globeMountEl.addEventListener('touchstart', onUserInteraction, { passive: true });
        globeMountEl.addEventListener('wheel', onUserInteraction, { passive: true });
 
        if (!prefersReducedMotion) {
          let pulseTime = 0;
          pulseIntervalRef.current = setInterval(() => {
            const g = globeRef.current;
            if (!mountedRef.current || !g) return;
 
            pulseTime += 0.016;
            const currentPoints = g.pointsData();
            const currentHtml = g.htmlElementsData();
 
            if (currentPoints && Array.isArray(currentPoints)) {
              currentPoints.forEach((pt) => {
                if (pt.isRecent) {
                  const pulse = Math.sin(pulseTime * 3 + pt.idx) * 0.04;
                  pt.altitude = (pt.baseAltitude ?? pt.altitude) + pulse;
                }
              });
              g.pointAltitude((p) => p.altitude);
            }
 
            if (currentHtml && Array.isArray(currentHtml)) {
              currentHtml.forEach((pt) => {
                if (pt.isRecent) {
                  const pulse = Math.sin(pulseTime * 3 + pt.idx) * 0.04;
                  pt.altitude = (pt.baseAltitude ?? pt.altitude) + pulse;
                }
                if (pt.__element) {
                  const visible = isPointVisible(g, pt.lat, pt.lng);
                  pt.__element.style.opacity = visible ? '1' : '0';
                  pt.__element.style.pointerEvents = visible ? 'auto' : 'none';
                }
              });
              g.htmlAltitude((d) => d.altitude);
            }
          }, 16);
        }
 
        setIsReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    };
 
    if (window.Globe) init();
    else setError('Globe library not loaded');
 
    return () => {
      mountedRef.current = false;
 
      globeMountEl.removeEventListener('mousedown', onUserInteraction);
      globeMountEl.removeEventListener('touchstart', onUserInteraction);
      globeMountEl.removeEventListener('wheel', onUserInteraction);
 
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
 
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
 
      const g = globeRef.current;
      if (g) {
        try {
          const renderer = g.renderer();
          if (renderer?.domElement?.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
          renderer?.dispose?.();
        } catch {
          // ignore
        }
      }
      globeRef.current = null;
 
      try {
        while (globeMountEl.firstChild) globeMountEl.removeChild(globeMountEl.firstChild);
      } catch {
        // ignore
      }
    };
  }, [scriptReady, visitorPoints]);
 
  return (
    <>
      <Script
        src="https://unpkg.com/globe.gl@2.31.0/dist/globe.gl.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError('Failed to load globe.gl library')}
      />
 
      <div className="w-full max-w-[600px] mx-auto">
        <div
          className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black"
          style={{
            boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), 0 0 120px rgba(59, 130, 246, 0.15)',
            height: isMobile ? '400px' : '600px',
          }}
        >
          <div ref={globeMountRef} className="absolute inset-0" />
 
          {!isReady && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
              <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
              <p className="text-sm text-gray-400">Loading globe...</p>
            </div>
          )}
 
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-6 z-10">
              <div className="text-center">
                <p className="text-red-400 font-semibold mb-2">Unable to Load Globe</p>
                <p className="text-gray-400 text-sm mb-4">{error}</p>
                <p className="text-gray-500 text-xs">Please refresh the page</p>
              </div>
            </div>
          )}
 
          {isReady && (
            <div className="absolute top-4 right-4 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-300 pointer-events-none z-20">
              <p>Drag to rotate • Scroll to zoom</p>
            </div>
          )}
        </div>
 
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {visitorPoints.filter((p) => p.isRecent).length} recent visitors •{' '}
            {visitorPoints.length} total locations
          </p>
        </div>
      </div>
    </>
  );
       }
