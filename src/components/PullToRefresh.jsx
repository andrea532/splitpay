import React, { useState, useRef, useCallback } from 'react';

const PullToRefresh = ({
  children,
  onRefresh,
  isRefreshing = false,
  threshold = 80,
  resistance = 2.5,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback(
    (e) => {
      if (containerRef.current.scrollTop === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
        setIsReleasing(false);
      }
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      if (distance > 0 && containerRef.current.scrollTop === 0) {
        e.preventDefault();
        const adjustedDistance = distance / resistance;
        setPullDistance(Math.min(adjustedDistance, threshold * 1.5));
      }
    },
    [isPulling, isRefreshing, resistance, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing) return;

    setIsPulling(false);
    setIsReleasing(true);

    if (pullDistance >= threshold) {
      // Trigger refresh
      setPullDistance(threshold);
      if (onRefresh) {
        await onRefresh();
      }
    }

    // Reset
    setTimeout(() => {
      setPullDistance(0);
      setIsReleasing(false);
    }, 300);
  }, [isPulling, isRefreshing, pullDistance, threshold, onRefresh]);

  const getRefreshStatus = () => {
    if (isRefreshing) return 'refreshing';
    if (pullDistance >= threshold) return 'release';
    if (pullDistance > 0) return 'pull';
    return 'idle';
  };

  const status = getRefreshStatus();
  const rotation = Math.min(180, (pullDistance / threshold) * 180);

  return (
    <div className="pull-to-refresh-container">
      <div
        className={`pull-to-refresh-indicator ${status}`}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isReleasing ? 'transform 0.3s ease' : 'none',
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div className="pull-to-refresh-content">
          {status === 'refreshing' ? (
            <div className="pull-to-refresh-spinner" />
          ) : (
            <div
              className="pull-to-refresh-arrow"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              ↓
            </div>
          )}
          <div className="pull-to-refresh-text">
            {status === 'pull' && 'Tira per aggiornare'}
            {status === 'release' && 'Rilascia per aggiornare'}
            {status === 'refreshing' && 'Aggiornamento...'}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="pull-to-refresh-content-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isReleasing ? 'transform 0.3s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Styles da aggiungere al tuo App.css
const pullToRefreshStyles = `
/* Pull to Refresh */
.pull-to-refresh-container {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.pull-to-refresh-content-wrapper {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.pull-to-refresh-indicator {
  position: absolute;
  top: -60px;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.pull-to-refresh-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.pull-to-refresh-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--gray-300);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.pull-to-refresh-arrow {
  font-size: 24px;
  color: var(--primary);
  transition: transform 0.2s ease;
}

.pull-to-refresh-text {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.pull-to-refresh-indicator.refreshing .pull-to-refresh-arrow {
  display: none;
}

@media (hover: hover) {
  /* Disable pull to refresh on devices with mouse */
  .pull-to-refresh-container {
    overflow-y: auto;
  }
  
  .pull-to-refresh-indicator {
    display: none;
  }
  
  .pull-to-refresh-content-wrapper {
    transform: none !important;
  }
}
`;

export default PullToRefresh;
