import { useState, useRef, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80, 
  resistance = 2.5 
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef(0);
  const startX = useRef(0);
  const currentY = useRef(0);
  const isScrolledToTop = useRef(false);

  const checkScrollPosition = () => {
    isScrolledToTop.current = window.scrollY === 0;
  };

  const handleTouchStart = (e: TouchEvent) => {
    checkScrollPosition();
    if (isScrolledToTop.current) {
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isScrolledToTop.current || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    
    const diffY = currentY.current - startY.current;
    const diffX = Math.abs(currentX - startX.current);

    // Only trigger pull-to-refresh if:
    // 1. Moving down (diffY > 0)
    // 2. Vertical movement is significantly more than horizontal (to avoid conflict with swipe-to-delete)
    // 3. Minimum vertical movement threshold
    if (diffY > 0 && diffY > diffX * 1.5 && diffY > 20) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      const distance = Math.min(diffY / resistance, threshold * 1.5);
      setPullDistance(distance);
      setIsPulling(distance > 10);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  };

  useEffect(() => {
    const target = document.body;
    
    target.addEventListener('touchstart', handleTouchStart, { passive: false });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('scroll', checkScrollPosition);

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('scroll', checkScrollPosition);
    };
  }, [isPulling, isRefreshing, pullDistance, threshold, resistance]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    shouldShowIndicator: isPulling || isRefreshing,
  };
}
