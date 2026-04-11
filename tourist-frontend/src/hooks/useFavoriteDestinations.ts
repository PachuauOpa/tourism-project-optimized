import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getFavoriteDestinationIdsForCurrentUser,
  PROFILE_AUTH_CHANGED_EVENT,
  PROFILE_FAVORITES_CHANGED_EVENT,
  toggleFavoriteDestinationForCurrentUser
} from '../utils/profileAuth';

export const useFavoriteDestinations = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteDestinationIdsForCurrentUser());

  const refreshFavorites = useCallback(() => {
    setFavoriteIds(getFavoriteDestinationIdsForCurrentUser());
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refreshFavorites();
    };

    window.addEventListener(PROFILE_AUTH_CHANGED_EVENT, handleUpdate);
    window.addEventListener(PROFILE_FAVORITES_CHANGED_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(PROFILE_AUTH_CHANGED_EVENT, handleUpdate);
      window.removeEventListener(PROFILE_FAVORITES_CHANGED_EVENT, handleUpdate);
    };
  }, [refreshFavorites]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback((destinationId: string): boolean => {
    return favoriteIdSet.has(destinationId);
  }, [favoriteIdSet]);

  const toggleFavorite = useCallback((destinationId: string) => {
    const result = toggleFavoriteDestinationForCurrentUser(destinationId);
    refreshFavorites();
    return result;
  }, [refreshFavorites]);

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    refreshFavorites
  };
};

export default useFavoriteDestinations;
