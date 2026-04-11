import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Screen from '../components/shared/Screen';
import { allDestinations } from '../data/destinations';
import { Destination, ActiveFilters } from '../types';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('query')?.toLowerCase() || '';
  const filtersParam = searchParams.get('filters');

  const filters = useMemo((): ActiveFilters => {
    try {
      return filtersParam ? JSON.parse(filtersParam) : {};
    } catch {
      return {};
    }
  }, [filtersParam]);

  const results = useMemo((): Destination[] => {
    let filteredResults = allDestinations;

    // Apply text search filter
    if (query) {
      filteredResults = filteredResults.filter((destination) => {
        const text = `${destination.name} ${destination.short} ${destination.detail}`.toLowerCase();
        return text.includes(query);
      });
    }

    // Apply category filters
    if (Object.keys(filters).length > 0) {
      filteredResults = filteredResults.filter((destination) => {
        // This is a simple example - in a real app you'd have categories on destinations
        // For now, we'll just filter based on some basic rules

        // Example: Filter by duration
        if (filters.duration && filters.duration.length > 0) {
          const timeText = destination.time.toLowerCase();
          const hasValidDuration = filters.duration.some(duration => {
            switch (duration) {
              case 'short': return timeText.includes('1h') || timeText.includes('30m');
              case 'medium': return timeText.includes('2h') || timeText.includes('3h') || timeText.includes('4h');
              case 'long': return timeText.includes('5h') || timeText.includes('6h') || timeText.includes('7h') || timeText.includes('8h');
              case 'overnight': return timeText.includes('day') || timeText.includes('night');
              default: return true;
            }
          });
          if (!hasValidDuration) return false;
        }

        // Example: Filter by type based on name/description
        if (filters.type && filters.type.length > 0) {
          const destText = `${destination.name} ${destination.short} ${destination.detail}`.toLowerCase();
          const hasValidType = filters.type.some(type => {
            switch (type) {
              case 'nature': return destText.includes('nature') || destText.includes('forest') || destText.includes('mountain');
              case 'culture': return destText.includes('heritage') || destText.includes('cultural') || destText.includes('village');
              case 'adventure': return destText.includes('trek') || destText.includes('climb') || destText.includes('adventure');
              case 'heritage': return destText.includes('heritage') || destText.includes('village') || destText.includes('cultural');
              case 'waterfall': return destText.includes('waterfall') || destText.includes('falls');
              case 'mountain': return destText.includes('mountain') || destText.includes('peak') || destText.includes('tlang');
              default: return true;
            }
          });
          if (!hasValidType) return false;
        }

        return true;
      });
    }

    return filteredResults;
  }, [query, filters]);

  const getActiveFiltersText = (): string => {
    const filterTexts: string[] = [];
    Object.entries(filters).forEach(([category, values]) => {
      if (values && values.length > 0) {
        filterTexts.push(`${category}: ${values.join(', ')}`);
      }
    });
    return filterTexts.join(' | ');
  };

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Search Results</h2>
      </div>
      <p className="page-note">
        {query && `Query: ${query}`}
        {query && getActiveFiltersText() && ' | '}
        {getActiveFiltersText() && `Filters: ${getActiveFiltersText()}`}
        {!query && !getActiveFiltersText() && 'All destinations'}
      </p>

      <div className="list-stack">
        {results.map((destination) => (
          <article className="info-card" key={destination.id}>
            <img src={destination.image} alt={destination.name} width={640} height={360} loading="lazy" decoding="async" />
            <h3>{destination.name}</h3>
            <p>{destination.detail}</p>
            <button type="button" className="row-btn" onClick={() => navigate(`/destinations-template/${destination.id}`)}>
              Open Details
              <img src="/icons/Arrow - Right.png" alt="Open" width="16" height="16" />
            </button>
          </article>
        ))}
      </div>
    </Screen>
  );
};

export default SearchPage;
