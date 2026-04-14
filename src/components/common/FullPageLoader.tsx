import styles from './FullPageLoader.module.css';

export function FullPageLoader() {
  return (
    <div className={styles.wrap} role="status" aria-label="Loading">
      <div className={styles.pulse}>
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.ring} />
      </div>
      <span className={styles.label}>Loading…</span>
    </div>
  );
}
