import { useQuery } from '@tanstack/react-query';
import type { Channel, ChannelListResponse, ChannelType } from '../types/channels';
import { apiClient } from '../services/api/client';

// ============================================
// QUERY KEYS
// ============================================

export const channelKeys = {
  all: ['channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (filters?: ChannelFilters) => [...channelKeys.lists(), filters] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  stats: () => [...channelKeys.all, 'stats'] as const,
  stat: (id: string) => [...channelKeys.stats(), id] as const,
} as const;

// ============================================
// TYPES
// ============================================

interface ChannelFilters {
  readonly type?: ChannelType;
  readonly status?: string;
  readonly page?: number;
  readonly page_size?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchChannels(filters?: ChannelFilters): Promise<ChannelListResponse> {
  const params = new URLSearchParams();

  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.page_size) params.append('page_size', filters.page_size.toString());

  const queryString = params.toString();
  const url = `/api/v1/channels${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<ChannelListResponse>(url);
}

async function fetchChannel(id: string): Promise<Channel> {
  return apiClient.get<Channel>(`/api/v1/channels/${id}`);
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch all channels with optional filtering
 * @param filters - Optional filters for channel type, status, pagination
 * @returns Query result with channel list and pagination
 */
export function useChannels(filters?: ChannelFilters) {
  return useQuery({
    queryKey: channelKeys.list(filters),
    queryFn: () => fetchChannels(filters),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch a single channel by ID
 * @param id - Channel ID
 * @returns Query result with channel details
 */
export function useChannel(id: string) {
  return useQuery({
    queryKey: channelKeys.detail(id),
    queryFn: () => fetchChannel(id),
    enabled: Boolean(id),
    staleTime: 30000,
    gcTime: 300000,
  });
}

/**
 * Hook to fetch connected channels only
 * @returns Query result with connected channels
 */
export function useConnectedChannels() {
  return useChannels({ status: 'connected' });
}

/**
 * Hook to fetch channels by type
 * @param type - Channel type (linkedin, twitter, etc.)
 * @returns Query result with filtered channels
 */
export function useChannelsByType(type: ChannelType) {
  return useChannels({ type });
}
