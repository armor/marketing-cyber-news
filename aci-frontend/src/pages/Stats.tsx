import { useState, useEffect } from 'react';
import { userService, type UserStats } from '../services/userService';

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">📊 Your Statistics</h2>
        <p className="text-gray-400">Track your cybersecurity learning progress</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Articles Read */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📰</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.total_articles_read}</p>
                <p className="text-gray-400">Articles Read</p>
              </div>
            </div>
          </div>

          {/* Total Reading Time */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {formatReadingTime(stats.total_reading_time_seconds)}
                </p>
                <p className="text-gray-400">Total Reading Time</p>
              </div>
            </div>
          </div>

          {/* Bookmarks */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔖</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.total_bookmarks}</p>
                <p className="text-gray-400">Saved Bookmarks</p>
              </div>
            </div>
          </div>

          {/* Reading Streak */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.reading_streak_days}</p>
                <p className="text-gray-400">Day Streak</p>
              </div>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.articles_read_this_week}</p>
                <p className="text-gray-400">Read This Week</p>
              </div>
            </div>
          </div>

          {/* Favorite Category */}
          {stats.favorite_category && (
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{stats.favorite_category.name}</p>
                  <p className="text-gray-400">
                    Favorite Category ({stats.favorite_category.count} articles)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !stats && (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg text-gray-300">No stats available yet</p>
          <p className="text-sm text-gray-500 mt-2">Start reading articles to build your statistics</p>
        </div>
      )}
    </div>
  );
}
