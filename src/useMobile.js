import { useState, useEffect } from "react";

/**
 * Custom hook to detect mobile viewport
 * @param {number} breakpoint - Breakpoint in em (default: 45em = 720px)
 * @returns {boolean} - True if viewport width < breakpoint * 16
 */
export function useMobile(breakpoint = 45) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint * 16);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener
    window.addEventListener("resize", checkMobile);
    
    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook for keyboard visibility detection
 * @returns {boolean} - True if virtual keyboard is visible
 */
export function useKeyboardVisible() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleFocus = () => setKeyboardVisible(true);
    const handleBlur = () => setKeyboardVisible(false);
    
    // Listen for focus/blur events on all inputs
    const inputs = document.querySelectorAll("input, textarea");
    inputs.forEach(input => {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    });
    
    // Handle window resize (keyboard visibility changes viewport height)
    const handleResize = () => {
      const originalViewportHeight = window.innerHeight;
      // If viewport height decreased significantly, keyboard is likely open
      if (window.visualViewport && window.visualViewport.height < originalViewportHeight * 0.7) {
        setKeyboardVisible(true);
      } else {
        setKeyboardVisible(false);
      }
    };
    
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    
    // Cleanup
    return () => {
      inputs.forEach(input => {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      });
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  return keyboardVisible;
}

/**
 * Hook for touch swipe detection
 * @returns {Object} - { onTouchStart, onTouchMove, onTouchEnd, swipeLeft, swipeRight }
 */
export function useSwipe(onSwipeLeft, onSwipeRight, threshold = 50) {
  const [touchStart, setTouchStart] = useState(null);

  const onTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  
  const onTouchMove = (e) => {
    if (!touchStart) return;
    const touchX = e.touches[0].clientX;
    const diff = touchStart - touchX;
    
    // Don't trigger until touch end for better UX
  };
  
  const onTouchEnd = (e) => {
    if (!touchStart) return;
    const touchX = e.changedTouches[0].clientX;
    const diff = touchStart - touchX;
    
    if (diff > threshold) {
      onSwipeLeft?.();
    } else if (diff < -threshold) {
      onSwipeRight?.();
    }
    
    setTouchStart(null);
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
