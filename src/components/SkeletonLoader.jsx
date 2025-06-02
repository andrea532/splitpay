import React from 'react';

const SkeletonLoader = ({ type = 'default', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'groups':
        return (
          <div className="skeleton-group-item">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-details">
              <div className="skeleton-title"></div>
              <div className="skeleton-subtitle"></div>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="skeleton-expense-item">
            <div className="skeleton-icon"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-meta"></div>
            </div>
            <div className="skeleton-amount"></div>
          </div>
        );

      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton-card-header"></div>
            <div className="skeleton-card-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="skeleton-default">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
        );
    }
  };

  return (
    <div className="skeleton-loader">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-item">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

// Styles da aggiungere al tuo App.css
const skeletonStyles = `
/* Skeleton Loader */
.skeleton-loader {
  padding: 0;
}

.skeleton-item {
  margin-bottom: var(--space-3);
}

/* Base skeleton animation */
@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

/* Common skeleton elements */
.skeleton-avatar,
.skeleton-icon,
.skeleton-title,
.skeleton-subtitle,
.skeleton-meta,
.skeleton-line,
.skeleton-amount,
.skeleton-card-header {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0px,
    var(--gray-100) 50px,
    var(--gray-200) 100px
  );
  background-size: 200px 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

/* Group skeleton */
.skeleton-group-item {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  margin-right: var(--space-3);
}

.skeleton-details {
  flex: 1;
}

.skeleton-title {
  height: 20px;
  width: 60%;
  margin-bottom: var(--space-1);
}

.skeleton-subtitle {
  height: 16px;
  width: 40%;
}

/* Expense skeleton */
.skeleton-expense-item {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  margin-right: var(--space-3);
}

.skeleton-content {
  flex: 1;
}

.skeleton-meta {
  height: 14px;
  width: 50%;
  margin-top: var(--space-1);
}

.skeleton-amount {
  width: 80px;
  height: 20px;
}

/* Card skeleton */
.skeleton-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.skeleton-card-header {
  height: 24px;
  width: 40%;
  margin-bottom: var(--space-3);
}

.skeleton-card-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-line {
  height: 16px;
  width: 100%;
}

.skeleton-line.short {
  width: 60%;
}
`;

export default SkeletonLoader;
