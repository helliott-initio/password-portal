import styles from './LoadingSkeleton.module.css';

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function SkeletonBox({ width, height = '18px', className = '' }: SkeletonBoxProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return <div className={`${styles.skeletonBox} ${className}`} style={style} aria-hidden="true" />;
}

interface SkeletonTableProps {
  rows?: number;
  columns?: Array<{ width?: string | number; flex?: number }>;
}

export function SkeletonTable({ rows = 5, columns = [] }: SkeletonTableProps) {
  // Default column layout if none provided
  const defaultColumns = [
    { width: '40px' },
    { flex: 2 },
    { flex: 1 },
    { width: '80px' },
    { width: '100px' },
  ];

  const cols = columns.length > 0 ? columns : defaultColumns;

  return (
    <div className={styles.skeletonTable} role="status" aria-live="polite" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          {cols.map((col, j) => (
            <SkeletonBox
              key={j}
              width={col.width}
              className={col.flex ? styles[`flex${col.flex}`] : ''}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 3 }: SkeletonCardProps) {
  return (
    <div className={styles.skeletonCards} role="status" aria-live="polite" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <SkeletonBox height="24px" width="60%" />
          <SkeletonBox height="16px" width="40%" />
          <div className={styles.skeletonCardContent}>
            <SkeletonBox height="14px" width="80%" />
            <SkeletonBox height="14px" width="90%" />
            <SkeletonBox height="14px" width="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
}

export function SkeletonList({ items = 5, showAvatar = false }: SkeletonListProps) {
  return (
    <div className={styles.skeletonList} role="status" aria-live="polite" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={styles.skeletonListItem}>
          {showAvatar && (
            <div className={styles.skeletonAvatar}>
              <SkeletonBox width="40px" height="40px" className={styles.skeletonAvatarCircle} />
            </div>
          )}
          <div className={styles.skeletonListContent}>
            <SkeletonBox height="16px" width="60%" />
            <SkeletonBox height="14px" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonStatsProps {
  count?: number;
}

export function SkeletonStats({ count = 5 }: SkeletonStatsProps) {
  return (
    <div className={styles.skeletonStats} role="status" aria-live="polite" aria-label="Loading stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonStatCard}>
          <SkeletonBox height="32px" width="48px" />
          <SkeletonBox height="14px" width="60px" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  width?: string | number;
}

export function SkeletonText({ lines = 3, width }: SkeletonTextProps) {
  return (
    <div className={styles.skeletonText}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          height="14px"
          width={i === lines - 1 ? '70%' : width || '100%'}
        />
      ))}
    </div>
  );
}

interface SkeletonFormProps {
  fields?: number;
}

export function SkeletonForm({ fields = 4 }: SkeletonFormProps) {
  return (
    <div className={styles.skeletonForm} role="status" aria-live="polite" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className={styles.skeletonField}>
          <SkeletonBox height="14px" width="120px" />
          <SkeletonBox height="40px" width="100%" />
        </div>
      ))}
    </div>
  );
}
