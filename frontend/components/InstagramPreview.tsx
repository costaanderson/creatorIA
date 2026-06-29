import { useState } from 'react';
import styles from '../styles/InstagramPreview.module.css';

interface Props {
  imageUrl?: string;
  caption?: string;
  username?: string;
  isCarousel?: boolean;
  slidesCount?: number;
}

type PreviewTab = 'feed' | 'reels';

export default function InstagramPreview({
  imageUrl,
  caption,
  username = '@brurodrigues_design',
  isCarousel = false,
  slidesCount = 1,
}: Props) {
  const [tab, setTab] = useState<PreviewTab>('feed');

  const truncatedCaption =
    caption && caption.length > 125 ? caption.slice(0, 125) + '… mais' : caption ?? '';

  const firstCaptionLine = caption ? caption.split('\n')[0] : '';

  return (
    <div className={styles.wrapper}>
      {/* Tab switcher */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === 'feed' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('feed')}
          type="button"
        >
          📱 Post/Feed
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'reels' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('reels')}
          type="button"
        >
          🎬 Reels
        </button>
      </div>

      {/* ── FEED TAB ──────────────────────────────────────────────── */}
      {tab === 'feed' && (
        <div className={styles.feedMock}>
          {/* Post header */}
          <div className={styles.feedHeader}>
            <div className={styles.feedAvatar} />
            <span className={styles.feedUsername}>{username}</span>
          </div>

          {/* Image */}
          <div className={styles.feedImageWrapper}>
            {imageUrl ? (
              <img src={imageUrl} alt="Post" className={styles.feedImage} />
            ) : (
              <div className={styles.feedImagePlaceholder}>
                <span className={styles.feedImagePlaceholderText}>Sem imagem</span>
              </div>
            )}
          </div>

          {/* Carousel dots */}
          {isCarousel && (
            <div className={styles.carouselDots}>
              {Array.from({ length: Math.min(slidesCount, 10) }).map((_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i === 0 ? styles.dotActive : ''}`}
                />
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className={styles.feedActions}>
            <div className={styles.feedActionsLeft}>
              <span className={styles.feedIcon}>❤️</span>
              <span className={styles.feedIcon}>🗨️</span>
              <span className={styles.feedIcon}>✈️</span>
            </div>
            <span className={styles.feedIcon}>🔖</span>
          </div>

          {/* Caption */}
          {caption && (
            <div className={styles.feedCaption}>
              <span className={styles.feedCaptionUsername}>{username}</span>{' '}
              {truncatedCaption}
            </div>
          )}
        </div>
      )}

      {/* ── REELS TAB ────────────────────────────────────────────── */}
      {tab === 'reels' && (
        <div className={styles.reelsMockWrapper}>
          <div className={styles.reelsMock}>
            {/* Background image */}
            {imageUrl ? (
              <img src={imageUrl} alt="Reel" className={styles.reelsImage} />
            ) : (
              <div className={styles.reelsPlaceholder} />
            )}

            {/* Play button overlay */}
            {!imageUrl && (
              <div className={styles.playOverlay}>
                <span className={styles.playIcon}>▶</span>
              </div>
            )}

            {/* Right-side actions */}
            <div className={styles.reelsActions}>
              <span className={styles.reelsActionIcon}>❤️</span>
              <span className={styles.reelsActionIcon}>🗨️</span>
              <span className={styles.reelsActionIcon}>➡️</span>
              <span className={styles.reelsActionIcon}>⋯</span>
            </div>

            {/* Bottom overlay */}
            <div className={styles.reelsBottom}>
              <span className={styles.reelsUsername}>{username}</span>
              {firstCaptionLine && (
                <span className={styles.reelsCaption}>{firstCaptionLine}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
