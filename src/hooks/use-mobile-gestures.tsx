"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SwipeGestureOptions {
  threshold?: number;
  restraint?: string;
  direction?: 'horizontal' | 'vertical' | 'both';
}

interface SwipeGestureResult {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

interface LongPressOptions {
  threshold?: number;
  delay?: number;
}

interface LongPressResult {
  isPressed: boolean;
  duration: number;
}

export function useSwipeGesture(elementRef: React.RefObject<HTMLElement>, options: SwipeGestureOptions = {}) {
  const [gesture, setGesture] = useState<SwipeGestureResult>({
    direction: null,
    distance: 0,
    velocity: 0,
  });

  const threshold = options.threshold || 50;
  const restraint = options.restraint || 'none';
  const direction = options.direction || 'horizontal';

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const handleMove = (e: TouchEvent) => {
      if (!startTime) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const deltaTime = Date.now() - startTime;

      if (deltaTime > 0) {
        const velocityX = Math.abs(deltaX / deltaTime);
        const velocityY = Math.abs(deltaY / deltaTime);

        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
          let detectedDirection: 'left' | 'right' | 'up' | 'down' | null = null;

          if (direction === 'horizontal' || direction === 'both') {
            detectedDirection = deltaX > 0 ? 'right' : 'left';
          } else if (direction === 'vertical' || direction === 'both') {
            detectedDirection = deltaY > 0 ? 'down' : 'up';
          }

          setGesture({
            direction: detectedDirection,
            distance: Math.max(Math.abs(deltaX), Math.abs(deltaY)),
            velocity: Math.max(velocityX, velocityY),
          });

          // Reset for next gesture
          startX = currentX;
          startY = currentY;
          startTime = Date.now();
        }
      }
    };

    const handleEnd = () => {
      startX = 0;
      startY = 0;
      startTime = 0;
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchmove', handleMove, { passive: true });
    element.addEventListener('touchend', handleEnd, { passive: true });
    element.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('touchcancel', handleEnd);
    };
  }, [elementRef, threshold, restraint, direction]);

  return gesture;
}

export function useLongPress(elementRef: React.RefObject<HTMLElement>, options: LongPressOptions = {}) {
  const [longPress, setLongPress] = useState<LongPressResult>({
    isPressed: false,
    duration: 0,
  });

  const threshold = options.threshold || 500;
  const delay = options.delay || 500;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let timeoutId: NodeJS.Timeout;

    const handleStart = () => {
      timeoutId = setTimeout(() => {
        setLongPress({
          isPressed: true,
          duration: delay,
        });
      }, delay);
    };

    const handleEnd = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLongPress({
        isPressed: false,
        duration: 0,
      });
    };

    const handleMove = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchend', handleEnd, { passive: true });
    element.addEventListener('touchmove', handleMove, { passive: true });
    element.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchcancel', handleEnd);
    };
  }, [elementRef, threshold, delay]);

  return longPress;
}

export function usePullToRefresh(elementRef: React.RefObject<HTMLElement>, onRefresh: () => void) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startY = 0;
    let currentY = 0;

    const handleStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      currentY = startY;
    };

    const handleMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      if (distance > 0 && distance < 150) {
        setIsPulling(true);
        setPullDistance(Math.min(distance / 2, 60));
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleEnd = () => {
      if (isPulling && pullDistance > 50) {
        onRefresh();
      }
      setIsPulling(false);
      setPullDistance(0);
      startY = 0;
      currentY = 0;
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchmove', handleMove, { passive: true });
    element.addEventListener('touchend', handleEnd, { passive: true });
    element.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('touchcancel', handleEnd);
    };
  }, [elementRef, onRefresh]);

  return { isPulling, pullDistance };
}

export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100],
      success: [10, 50, 10],
      warning: [50, 50],
      error: [100, 50, 100],
    };

    navigator.vibrate(patterns[type] || patterns.light);
  }, []);

  return { triggerHaptic };
}