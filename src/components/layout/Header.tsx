import { useAuth, useIsAdmin } from '../../hooks/useAuth';
import styles from './Header.module.css';

export function Header() {
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <svg
            className={styles.logoIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className={styles.logoText}>Password Portal</span>
        </div>

        <nav className={styles.nav}>
          <a href="/admin" className={styles.navLink}>
            Dashboard
          </a>
          <a href="/admin/create" className={styles.navLink}>
            Create Link
          </a>
          <a href="/admin/queue" className={styles.navLink}>
            Queue
          </a>
          {isAdmin && (
            <a href="/admin/settings" className={styles.navLink}>
              Settings
            </a>
          )}
        </nav>

        <div className={styles.userSection}>
          {user && (
            <>
              <div className={styles.userInfo}>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className={styles.avatar}
                  />
                )}
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user.displayName}</span>
                  <span className={styles.userRole}>
                    {user.role === 'admin' ? 'Admin' : 'Technician'}
                  </span>
                </div>
              </div>
              <button onClick={signOut} className={styles.signOutBtn}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
