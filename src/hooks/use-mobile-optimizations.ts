"use client";

import { useState, useEffect, useCallback } from "react";

interface UseMobileOptimizationsReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isOnline: boolean;
  connectionType: string;
  saveToLocalStorage: (key: string, value: any) => void;
  getFromLocalStorage: (key: string) => any;
  removeFromLocalStorage: (key: string) => void;
  triggerHapticFeedback: (type: 'light' | 'medium' | 'heavy') => void;
  requestNotificationPermission: () => Promise<boolean>;
  sendNotification: (title: string, body: string, options?: NotificationOptions) => void;
}

export function useMobileOptimizations(): UseMobileOptimizationsReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth <= 1024;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 1024;

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Connection type detection
  useEffect(() => {
    const updateConnectionType = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };

    updateConnectionType();
    const interval = setInterval(updateConnectionType, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // LocalStorage helpers
  const saveToLocalStorage = useCallback((key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  const getFromLocalStorage = useCallback((key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }, []);

  const removeFromLocalStorage = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }, []);

  // Haptic feedback
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy') => {
    if (!('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100],
    };

    navigator.vibrate(patterns[type]);
  }, []);

  // Notification helpers
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'reinplaner-notification',
      requireInteraction: false,
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, []);

  // Performance optimizations
  useEffect(() => {
    // Preload critical resources
    if ('serviceWorker' in navigator && isOnline) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Optimize images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.loading = 'lazy';
    });

    // Optimize scrolling
    document.body.style.touchAction = 'manipulation';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitTapHighlightColor = 'transparent';
  }, [isOnline]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isOnline,
    connectionType,
    saveToLocalStorage,
    getFromLocalStorage,
    removeFromLocalStorage,
    triggerHapticFeedback,
    requestNotificationPermission,
    sendNotification,
  };
}