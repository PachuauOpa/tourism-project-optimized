import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';
import AnimatedSection from '../components/shared/AnimatedSection';
import { fetchManagedDestinations, toDestinationCards } from '../utils/destinationApi';
import { Destination } from '../types';
import './PlannerPage.css';

// ── Constants ──
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:4001';

const DURATION_OPTIONS = ['1 Day', '2-3 Days', 'A Week+'] as const;
type DurationOption = (typeof DURATION_OPTIONS)[number];

interface InterestOption {
  id: string;
  emoji: string;
  title: string;
  tags: string;
  matchKeywords: string[];
}

const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'history-culture',
    emoji: '🏛️',
    title: 'History & Culture',
    tags: 'Heritage · Cultural · Village',
    matchKeywords: ['heritage', 'cultural', 'village', 'history', 'museum', 'church'],
  },
  {
    id: 'water-scenery',
    emoji: '🌊',
    title: 'Water & Scenery',
    tags: 'Waterfall · Lake · Viewpoint',
    matchKeywords: ['waterfall', 'lake', 'viewpoint', 'scenic', 'river', 'dam'],
  },
  {
    id: 'nature-wildlife',
    emoji: '🦁',
    title: 'Nature & Wildlife',
    tags: 'Wildlife · Park · Forest',
    matchKeywords: ['wildlife', 'park', 'nature', 'forest', 'sanctuary', 'trek'],
  },
  {
    id: 'adventure-caves',
    emoji: '🪨',
    title: 'Adventure & Caves',
    tags: 'Cave · Viewpoint · Waterfall',
    matchKeywords: ['cave', 'adventure', 'rock', 'climbing', 'trekking', 'peak'],
  },
];

// ── Itinerary types ──
interface ItineraryActivity {
  time: string;
  name: string;
  description: string;
  duration: string;
  type: string;
  tip?: string;
}

interface ItineraryDay {
  dayNumber: number;
  theme: string;
  activities: ItineraryActivity[];
}

interface Itinerary {
  title: string;
  summary: string;
  days: ItineraryDay[];
  tips?: string[];
}

type WizardStep = 'setup' | 'loading' | 'results' | 'error';

// ── Component ──
const PlannerPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('setup');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Destination data for context
  const [destinations, setDestinations] = useState<Destination[]>([]);

  // Load destinations for AI context
  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const records = await fetchManagedDestinations();
        setDestinations(toDestinationCards(records));
      } catch {
        // Non-critical — AI can still generate without destination context
        console.warn('Could not load destinations for AI context');
      }
    };
    void loadDestinations();
  }, []);

  // Toggle interest selection
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Check if ready to generate
  const canGenerate = selectedDuration !== null && selectedInterests.size > 0;

  // Build summary text
  const summaryText = (() => {
    if (!selectedDuration && selectedInterests.size === 0) return '';
    const parts: string[] = [];
    if (selectedDuration) parts.push(selectedDuration);
    const interestNames = INTEREST_OPTIONS.filter((o) => selectedInterests.has(o.id)).map((o) => o.title);
    if (interestNames.length > 0) parts.push(interestNames.join(', '));
    return parts.join(' · ');
  })();

  // Generate itinerary via tourist-AI service
  const generateItinerary = useCallback(async () => {
    if (!canGenerate) return;

    setStep('loading');
    setErrorMessage('');

    try {
      const interestLabels = INTEREST_OPTIONS
        .filter((o) => selectedInterests.has(o.id))
        .map((o) => o.title);

      // Filter destinations by matching interests for better context
      const matchKeywords = INTEREST_OPTIONS
        .filter((o) => selectedInterests.has(o.id))
        .flatMap((o) => o.matchKeywords);

      const relevantDestinations = destinations.length > 0
        ? destinations.filter((d) => {
            const combined = [
              d.name, d.short, d.detail, d.type, ...d.activityType, ...(d.typeTags || []),
            ].join(' ').toLowerCase();
            return matchKeywords.some((kw) => combined.includes(kw));
          })
        : [];

      // If no matches, send all destinations as context
      const contextDestinations = relevantDestinations.length > 0 ? relevantDestinations : destinations.slice(0, 20);

      const response = await fetch(`${AI_API_URL}/api/ai/generate-itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: selectedDuration,
          interests: interestLabels,
          destinations: contextDestinations.map((d) => ({
            name: d.name,
            short: d.short,
            region: d.region,
            activityType: d.activityType,
            type: d.type,
            duration: d.duration,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate itinerary');
      }

      const data = await response.json();
      if (data.success && data.itinerary) {
        setItinerary(data.itinerary);
        setStep('results');
      } else {
        throw new Error(data.message || 'Invalid response from AI service');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(message);
      setStep('error');
    }
  }, [canGenerate, selectedDuration, selectedInterests, destinations]);

  // Reset to start
  const resetWizard = () => {
    setStep('setup');
    setSelectedDuration(null);
    setSelectedInterests(new Set());
    setItinerary(null);
    setErrorMessage('');
  };

  // Regenerate with same settings
  const regenerate = () => {
    void generateItinerary();
  };

  // Activity type → emoji
  const typeEmoji: Record<string, string> = {
    nature: '🌿',
    culture: '🏛️',
    adventure: '🧗',
    food: '🍜',
    scenic: '🌄',
  };

  return (
    <Screen className="planner-page">
      {/* ── Top bar ── */}
      <div className="planner-top-bar">
        <button type="button" className="planner-back-btn" onClick={() => navigate('/home')} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="planner-page-title">
          <span className="ai-sparkle">✨</span>
          AI Trip Planner
        </h1>
      </div>

      {/* ── Setup step ── */}
      {step === 'setup' && (
        <AnimatedSection delay={0.05} className="planner-steps">
          {/* Step indicator */}
          <div className="planner-step-indicator">
            <div className={`step-dot ${selectedDuration ? 'completed' : 'active'}`} />
            <div className={`step-dot ${selectedInterests.size > 0 ? 'completed' : selectedDuration ? 'active' : ''}`} />
          </div>

          {/* Step 1: Duration */}
          <p className="planner-section-label">How long are you staying?</p>
          <div className="duration-pills">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`duration-pill ${selectedDuration === option ? 'selected' : ''}`}
                onClick={() => setSelectedDuration(option)}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Step 2: Interests */}
          <p className="planner-section-label">What are you most interested in?</p>
          <div className="interest-grid">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest.id}
                type="button"
                className={`interest-card ${selectedInterests.has(interest.id) ? 'selected' : ''}`}
                onClick={() => toggleInterest(interest.id)}
              >
                <span className="interest-emoji">{interest.emoji}</span>
                <p className="interest-title">{interest.title}</p>
                <span className="interest-tags">{interest.tags}</span>
              </button>
            ))}
          </div>

          {/* Summary */}
          {summaryText && (
            <div className="planner-summary">
              <span className="summary-icon">📋</span>
              <p className="summary-text">{summaryText}</p>
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            className="planner-generate-btn"
            disabled={!canGenerate}
            onClick={() => void generateItinerary()}
          >
            <span>✨</span>
            Generate My Itinerary
          </button>
        </AnimatedSection>
      )}

      {/* ── Loading step ── */}
      {step === 'loading' && (
        <div className="planner-loading">
          <div className="planner-loading-spinner" />
          <p className="planner-loading-text">Crafting your perfect itinerary...</p>
          <p className="planner-loading-sub">Our AI is analyzing destinations and building your trip plan</p>
        </div>
      )}

      {/* ── Error step ── */}
      {step === 'error' && (
        <AnimatedSection delay={0.05} className="planner-steps">
          <div className="planner-error">
            <div className="planner-error-icon">😔</div>
            <p className="planner-error-text">Generation Failed</p>
            <p className="planner-error-sub">{errorMessage}</p>
            <button type="button" className="planner-retry-btn" onClick={regenerate}>
              Try Again
            </button>
          </div>
          <button type="button" className="planner-regenerate-btn" onClick={resetWizard} style={{ width: '100%' }}>
            ← Start Over
          </button>
        </AnimatedSection>
      )}

      {/* ── Results step ── */}
      {step === 'results' && itinerary && (
        <AnimatedSection delay={0.05} className="planner-results">
          {/* Success banner */}
          <div className="itinerary-banner">
            <div className="banner-top-row">
              <span className="banner-sparkle">✨</span>
              <button
                type="button"
                className="banner-transport-btn"
                onClick={() => navigate('/service/cabs')}
              >
                Transport →
              </button>
            </div>
            <h2 className="banner-title">Your Itinerary is Ready!</h2>
            <p className="banner-subtitle">{itinerary.summary}</p>
          </div>

          {/* Day-by-day timeline */}
          {itinerary.days.map((day) => (
            <div key={day.dayNumber} className="itinerary-day">
              <span className="day-pill">Day {day.dayNumber}</span>
              {day.theme && <p className="day-theme">{day.theme}</p>}

              <div className="timeline">
                {day.activities.map((activity, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-card">
                      <p className="timeline-time">{activity.time}</p>
                      <p className="timeline-name">{activity.name}</p>
                      <p className="timeline-desc">{activity.description}</p>
                      <div className="timeline-meta">
                        <span className="timeline-type-badge">
                          {typeEmoji[activity.type] || '📍'} {activity.type}
                        </span>
                        {activity.duration && (
                          <span className="timeline-duration-badge">⏱ {activity.duration}</span>
                        )}
                      </div>
                      {activity.tip && <div className="timeline-tip">💡 {activity.tip}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Travel tips */}
          {itinerary.tips && itinerary.tips.length > 0 && (
            <div className="itinerary-tips">
              <h4>Travel Tips</h4>
              <ul>
                {itinerary.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="planner-actions">
            <button type="button" className="planner-regenerate-btn" onClick={regenerate}>
              🔄 Regenerate
            </button>
            <button type="button" className="planner-new-btn" onClick={resetWizard}>
              ✨ New Plan
            </button>
          </div>
        </AnimatedSection>
      )}
    </Screen>
  );
};

export default PlannerPage;
