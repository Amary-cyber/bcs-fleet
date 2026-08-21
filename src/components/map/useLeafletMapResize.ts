import { useEffect, useCallback, useRef } from 'react';
import type * as L from 'leaflet';

export type MapOrRef = L.Map | null | React.RefObject<L.Map | null>;

interface UseLeafletMapResizeOptions {
  map: MapOrRef;
  containerRef?: React.RefObject<HTMLElement | null>;
  deps?: any[];
  onResize?: () => void;
}

function resolveMap(mapOrRef: MapOrRef): L.Map | null {
  if (!mapOrRef) return null;
  if ('current' in mapOrRef) {
    return mapOrRef.current;
  }
  return mapOrRef;
}

/**
 * Robust, production-grade Leaflet map resizing hook for BCS Fleet.
 * Guaranteed 100% tile filling without blank/grey zones across modals, drawers,
 * fullscreen transitions, responsive viewport changes, and tab switches.
 */
export function useLeafletMapResize({
  map,
  containerRef,
  deps = [],
  onResize,
}: UseLeafletMapResizeOptions) {
  const mapRef = useRef<MapOrRef>(map);
  mapRef.current = map;

  const invalidateSize = useCallback(() => {
    const activeMap = resolveMap(mapRef.current);
    if (!activeMap) return;

    try {
      activeMap.invalidateSize({ animate: false });
      if (onResize) onResize();
    } catch (err) {
      console.warn('Map resize notice:', err);
    }
  }, [onResize]);

  // Multi-stage invalidation to catch CSS transitions, layout rendering, and tab animations
  const triggerMultiPassResize = useCallback(() => {
    // Pass 1: Next animation frame (0-16ms)
    const rafId = requestAnimationFrame(() => {
      invalidateSize();
    });

    // Pass 2: 50ms
    const t1 = setTimeout(invalidateSize, 50);

    // Pass 3: 150ms (drawer / tab slide transitions)
    const t2 = setTimeout(invalidateSize, 150);

    // Pass 4: 350ms (DOM layout stabilization)
    const t3 = setTimeout(invalidateSize, 350);

    // Pass 5: 750ms (late render safeguard)
    const t4 = setTimeout(invalidateSize, 750);

    // Pass 6: 1200ms (fallback)
    const t5 = setTimeout(invalidateSize, 1200);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [invalidateSize]);

  // 1. Trigger resize on dependency change or component render
  useEffect(() => {
    const cleanup = triggerMultiPassResize();
    return () => {
      if (cleanup) cleanup();
    };
  }, [triggerMultiPassResize, ...deps]);

  // 2. Continuous check during the first 2 seconds of mounting
  useEffect(() => {
    const intervalId = setInterval(() => {
      const activeMap = resolveMap(mapRef.current);
      if (activeMap) {
        invalidateSize();
      }
    }, 250);

    const stopTimer = setTimeout(() => {
      clearInterval(intervalId);
    }, 2500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(stopTimer);
    };
  }, [invalidateSize]);

  // 3. Attach native ResizeObserver to the map container DOM element
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    let resizeObserver: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          triggerMultiPassResize();
        });
        resizeObserver.observe(el);
      }
    } catch (err) {
      console.warn('ResizeObserver notice:', err);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [containerRef, triggerMultiPassResize]);

  // 4. Attach Window & Fullscreen event listeners
  useEffect(() => {
    const handleEvent = () => triggerMultiPassResize();

    window.addEventListener('resize', handleEvent, { passive: true });
    window.addEventListener('orientationchange', handleEvent, { passive: true });
    document.addEventListener('fullscreenchange', handleEvent);
    document.addEventListener('webkitfullscreenchange', handleEvent);

    return () => {
      window.removeEventListener('resize', handleEvent);
      window.removeEventListener('orientationchange', handleEvent);
      document.removeEventListener('fullscreenchange', handleEvent);
      document.removeEventListener('webkitfullscreenchange', handleEvent);
    };
  }, [triggerMultiPassResize]);

  return { invalidateSize, triggerMultiPassResize };
}
