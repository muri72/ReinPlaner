"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  fps: number;
  networkSpeed: number;
}

interface UseMobilePerformanceOptions {
  enableMetrics?: boolean;
  enableOptimizations?: boolean;
  targetFPS?: number;
}

export function useMobilePerformance(options: UseMobilePerformanceOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
    networkSpeed: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number | undefined>(undefined);

  const enableMetrics = options.enableMetrics || false;
  const enableOptimizations = options.enableOptimizations || true;
  const targetFPS = options.targetFPS || 60;

  // Performance monitoring
  const measurePerformance = useCallback(() => {
    if (!enableMetrics) return;

    frameCount.current++;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime.current;

    if (deltaTime >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / deltaTime);
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

      setMetrics(prev => ({
        ...prev,
        fps,
        memoryUsage,
        renderTime: deltaTime,
      }));

      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  }, [enableMetrics]);

  // Optimized render loop
  const optimizedRender = useCallback((callback: () => void) => {
    if (enableOptimizations) {
      // Use requestAnimationFrame for smooth animations
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        callback();
        measurePerformance();
      });
    } else {
      callback();
      measurePerformance();
    }
  }, [enableOptimizations, measurePerformance]);

  // Memory management
  const clearMemory = useCallback(() => {
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
    
    // Clear unused event listeners
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      const clone = element.cloneNode(true);
      element.parentNode?.replaceChild(clone, element);
    });
  }, []);

  // Network optimization
  const measureNetworkSpeed = useCallback(async () => {
    if (!enableMetrics) return;

    const startTime = performance.now();
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
      });
      const endTime = performance.now();
      const speed = 1000 / (endTime - startTime);
      
      setMetrics(prev => ({
        ...prev,
        networkSpeed: speed,
      }));
    } catch (error) {
      console.warn('Network speed measurement failed:', error);
    }
  }, [enableMetrics]);

  // Image optimization
  const optimizeImages = useCallback(() => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.loading = 'lazy';
      img.decoding = 'async';
      
      // Add error handling
      img.onerror = () => {
        img.style.display = 'none';
      };
    });
  }, []);

  // Scroll optimization
  const optimizeScroll = useCallback(() => {
    const scrollContainers = document.querySelectorAll('.mobile-scroll-container');
    scrollContainers.forEach(container => {
      (container as HTMLElement).style.setProperty('-webkit-overflow-scrolling', 'touch');
      (container as HTMLElement).style.overscrollBehavior = 'contain';
    });
  }, []);

  // Initialize optimizations
  useEffect(() => {
    if (enableOptimizations) {
      optimizeImages();
      optimizeScroll();
      
      // Measure initial network speed
      measureNetworkSpeed();
      
      // Set up performance monitoring
      const interval = setInterval(measurePerformance, 1000);
      
      return () => clearInterval(interval);
    }
  }, [enableOptimizations, measurePerformance, measureNetworkSpeed]);

  return {
    metrics,
    optimizedRender,
    clearMemory,
    measureNetworkSpeed,
    optimizeImages,
    optimizeScroll,
  };
}

export function useMobileViewport() {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    orientation: 'portrait' as 'portrait' | 'landscape',
    isMobile: false,
    isTablet: false,
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      setViewport({
        width,
        height,
        orientation,
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  return viewport;
}

export function useBatteryOptimization() {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [isLowBatteryMode, setIsLowBatteryMode] = useState(false);

  useEffect(() => {
    if ('getBattery' in navigator) {
      const handleBatteryChange = (battery: any) => {
        setBatteryLevel(battery.level);
        setIsLowBatteryMode(battery.level <= 0.2);
      };

      (navigator as any).getBattery?.().then(handleBatteryChange).catch(console.error);
    }
  }, []);

  return {
    batteryLevel,
    isLowBatteryMode,
    enablePowerSaving: () => {
      // Reduce animations, lower quality, etc.
      document.body.classList.add('power-saving-mode');
    },
    disablePowerSaving: () => {
      document.body.classList.remove('power-saving-mode');
    },
  };
}