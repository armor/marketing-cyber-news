/**
 * Stats Page - Fortified Horizon Theme
 *
 * User's cybersecurity learning statistics.
 * Uses CSS custom properties for all styling values.
 */
import { useState, useEffect } from 'react';
import { userService, type UserStats } from '../services/userService';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function Stats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getStats();
      setStats(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  };

  const formatReadingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2
          className="font-bold"
          style={{
            fontSize: 'var(--typography-font-size-2xl)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Your Statistics
        </h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Track your cybersecurity learning progress
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center" style={{ padding: 'var(--spacing-12) 0' }}>
          <LoadingSpinner size="lg" label="Loading stats..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div
          style={{
            background: 'var(--gradient-badge-critical)',
            border: '1px solid var(--color-semantic-error)',
            color: 'var(--color-semantic-error)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            borderRadius: 'var(--border-radius-md)',
          }}
        >
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && stats && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: 'var(--spacing-6)' }}
        >
          {/* Total Articles Read */}
          <Card style={{ padding: 'var(--spacing-6)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-full)',
                  background: 'var(--gradient-component)',
                }}
              >
                <span style={{ fontSize: 'var(--typography-font-size-2xl)' }}>📰</span>
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--typography-font-size-3xl)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {stats.total_articles_read}
                </p>
                <p style={{ color: 'var(--color-text-muted)' }}>Articles Read</p>
              </div>
            </div>
          </Card>

          {/* Total Reading Time */}
          <Card style={{ padding: 'var(--spacing-6)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-full)',
                  background: 'var(--gradient-component)',
                }}
              >
                <span style={{ fontSize: 'var(--typography-font-size-2xl)' }}>⏱️</span>
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--typography-font-size-3xl)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {formatReadingTime(stats.total_reading_time_seconds)}
                </p>
                <p style={{ color: 'var(--color-text-muted)' }}>Total Reading Time</p>
              </div>
            </div>
          </Card>

          {/* Bookmarks */}
          <Card style={{ padding: 'var(--spacing-6)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-full)',
                  background: 'var(--gradient-component)',
                }}
              >
                <span style={{ fontSize: 'var(--typography-font-size-2xl)' }}>🔖</span>
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--typography-font-size-3xl)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {stats.total_bookmarks}
                </p>
                <p style={{ color: 'var(--color-text-muted)' }}>Saved Bookmarks</p>
              </div>
            </div>
          </Card>

          {/* Reading Streak */}
          <Card style={{ padding: 'var(--spacing-6)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-full)',
                  background: 'var(--gradient-component)',
                }}
              >
                <span style={{ fontSize: 'var(--typography-font-size-2xl)' }}>🔥</span>
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--typography-font-size-3xl)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {stats.reading_streak_days}
                </p>
                <p style={{ color: 'var(--color-text-muted)' }}>Day Streak</p>
              </div>
            </div>
          </Card>

          {/* This Week */}
          <Card style={{ padding: 'var(--spacing-6)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-full)',
                  background: 'var(--gradient-component)',
                }}
              >
                <span style={{ fontSize: 'var(--typography-font-size-2xl)' }}>📅</span>
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--typography-font-size-3xl)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {stats.articles_read_this_week}
                </p>
                <p style={{ color: 'var(--color-text-muted)' }}>Read This Week</p>
              </div>
            </div>
          </Card>

          {/* Favorite Category */}
          {stats.favorite_category && (
            <Card style={{ padding: 'var(--spacing-6)' }}>
              <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 'var(--spacing-12)',
                    height: 'var(--spacing-12)',
                    borderRadius: 'var(--border-radius-full)',
                    background: 'var(--gradient-component)',
                  }}
                >
                  <span style={{ fontSize: 'var(--typography-font-size-2xl)' }}>⭐</span>
                </div>
                <div>
                  <p
                    className="font-bold"
                    style={{
                      fontSize: 'var(--typography-font-size-xl)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {stats.favorite_category.name}
                  </p>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Favorite Category ({stats.favorite_category.count} articles)
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !stats && (
        <Card
          className="text-center"
          style={{ padding: 'var(--spacing-12)' }}
        >
          <p style={{ fontSize: 'var(--typography-font-size-4xl)', marginBottom: 'var(--spacing-4)' }}>
            📊
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              color: 'var(--color-text-secondary)',
            }}
          >
            No stats available yet
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--spacing-2)',
            }}
          >
            Start reading articles to build your statistics
          </p>
        </Card>
      )}
    </div>
  );
}
