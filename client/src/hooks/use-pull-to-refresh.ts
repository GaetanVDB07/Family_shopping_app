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
  const isScrolledToTop = useRef(false);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const checkScrollPosition = () => {
    isScrolledToTop.current = window.scrollY <= 0;
  };

  const resetPull = () => {
    isPullingRef.current = false;
    pullDistanceRef.current = 0;
    setIsPulling(false);
    setPullDistance(0);
  };

  const handleTouchStart = (e: TouchEvent) => {
    checkScrollPosition();
    if (!isScrolledToTop.current || e.touches.length !== 1) {
      resetPull();
      return;
    }

    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isScrolledToTop.current || isRefreshingRef.current || e.touches.length !== 1) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    
    const diffY = currentY - startY.current;
    const diffX = Math.abs(currentX - startX.current);

    // Only trigger pull-to-refresh if:
    // 1. Moving down (diffY > 0)
    // 2. Vertical movement is significantly more than horizontal (to avoid conflict with swipe-to-delete)
    // 3. Minimum vertical movement threshold
    if (diffY > 0 && diffY > diffX * 1.5 && diffY > 20) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      const distance = Math.min(diffY / resistance, threshold * 1.5);
      pullDistanceRef.current = distance;
      isPullingRef.current = distance > 10;
      setPullDistance(distance);
      setIsPulling(isPullingRef.current);
    }
  };

  const handleTouchEnd = async () => {
    if (isRefreshingRef.current) return;
    if (!isPullingRef.current) {
      resetPull();
      return;
    }

    if (pullDistanceRef.current >= threshold) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      try {
        await onRefreshRef.current();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    }

    resetPull();
  };

  const handleTouchCancel = () => {
    resetPull();
  };

  useEffect(() => {
    const target = document.body;
    
    target.addEventListener('touchstart', handleTouchStart, { passive: false });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd);
    target.addEventListener('touchcancel', handleTouchCancel);
    window.addEventListener('scroll', checkScrollPosition);

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchCancel);
      window.removeEventListener('scroll', checkScrollPosition);
    };
  }, [threshold, resistance]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    shouldShowIndicator: isPulling || isRefreshing,
  };
}
