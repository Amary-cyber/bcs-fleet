import { useEffect, useCallback } from 'react';
import type * as L from 'leaflet';

interface UseLeafletMapResizeOptions {
  map: L.Map | null;
  containerRef: React.RefObject<HTMLElement | null>;
  deps?: any[];
  onResize?: () => void;
}

/**
 * Universal Leaflet map resizing hook for BCS Fleet.
 * Handles window resize, ResizeObserver container changes, fullscreen transitions,
 * modal/drawer open & close, and tab switching with multi-pass invalidateSize().
 */
export function useLeafletMapResize({
  map,
  containerRef,
  deps = [],
  onResize,
}: UseLeafletMapResizeOptions) {
  const invalidateSize = useCallback(() => {
    if (!map) return;

    // 1st pass: Next animation frame
    requestAnimationFrame(() => {
      if (map) {
        map.invalidateSize({ animate: false });
        if (onResize) onResize();
      }
    });

    // 2nd pass: 150ms (allows CSS transitions / drawer slide-outs to settle)
    const t1 = setTimeout(() => {
      if (map) {
        map.invalidateSize({ animate: false });
        if (onResize) onResize();
      }
    }, 150);

    // 3rd pass: 350ms (safeguard for slower mobile device renders)
    const t2 = setTimeout(() => {
      if (map) {
        map.invalidateSize({ animate: false });
        if (onResize) onResize();
      }
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, onResize]);

  // 1. Trigger resize on dependency change or initial mount
  useEffect(() => {
    if (!map) return;
    const cleanup = invalidateSize();
    return () => {
      if (cleanup) cleanup();
    };
  }, [map, invalidateSize, ...deps]);

  // 2. Attach ResizeObserver to the map container DOM element
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !map) return;

    let resizeObserver: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          invalidateSize();
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
  }, [map, containerRef, invalidateSize]);

  // 3. Attach Window & Fullscreen event listeners
  useEffect(() => {
    if (!map) return;

    const handleWindowResize = () => invalidateSize();
    const handleFullscreen = () => invalidateSize();
    const handleOrientation = () => invalidateSize();

    window.addEventListener('resize', handleWindowResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientation, { passive: true });
    document.addEventListener('fullscreenchange', handleFullscreen);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleOrientation);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [map, invalidateSize]);

  return { invalidateSize };
}
