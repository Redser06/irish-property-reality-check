import React, { useState } from 'react';
import { ComparisonResult, IrishPropertyInput } from '../types';
import { AlertTriangle, Trophy, Sun, Beer, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RemorseDashboardProps {
  comparisons: ComparisonResult[];
  irishInput: IrishPropertyInput;
  onSelectCity: (comparison: ComparisonResult) => void;
}

export const RemorseDashboard: React.FC<RemorseDashboardProps> = ({
  comparisons,
  irishInput,
  onSelectCity
}) => {
  // Declared before the early return so hook order stays stable.
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (comparisons.length === 0) return null;

  // Calculate overall dread level (average of top 5 highest remorse cities)
  const sortedByRemorse = [...comparisons].sort((a, b) => b.remorseIndex - a.remorseIndex);
  const top5 = sortedByRemorse.slice(0, 5);
  const avgDread = Math.round(top5.reduce((sum, c) => sum + c.remorseIndex, 0) / top5.length);

  // Top 3 Cities for Maximum Shock
  const top3 = sortedByRemorse.slice(0, 3);

  // Maximum space multiplier
  const maxSpace = [...comparisons].sort((a, b) => b.spaceMultiplier - a.spaceMultiplier)[0];

  // Highest sun gain
  const maxSun = [...comparisons].sort((a, b) => b.sunnyDaysDiff - a.sunnyDaysDiff)[0];

  const handleConfetti = () => {
    // The user explicitly asked for confetti, but keep it brief and sparse
    // for anyone who has asked the OS to reduce motion.
    confetti({
      particleCount: prefersReducedMotion ? 25 : 100,
      spread: prefersReducedMotion ? 35 : 70,
      ticks: prefersReducedMotion ? 60 : 200,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f59e0b', '#f43f5e', '#3b82f6']
    });
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(24, 15, 38, 0.9) 100%)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'center' }}>
        
        {/* Left Column: Existential Dread Gauge */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle color="var(--accent-rose)" size={20} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Buyer's Remorse & Existential Dread Gauge
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-rose)', lineHeight: 1 }}>
              {avgDread}/100
            </span>
            <span className="badge badge-rose" style={{ fontSize: '0.85rem' }}>
              {avgDread >= 75 ? '🔥 Severe Existential Shock' : avgDread >= 50 ? '⚠️ High Envy Warning' : '☘️ Manageable Irish Craic'}
            </span>
          </div>

          {/* Dread Progress Bar */}
          <div style={{ width: '100%', height: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
            <div
              style={{
                width: `${avgDread}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #34d399 0%, #fbbf24 50%, #f43f5e 100%)',
                borderRadius: '6px',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Based on your <strong style={{ color: '#fff' }}>€{irishInput.priceEur.toLocaleString()}</strong> budget in <strong style={{ color: '#fff' }}>{irishInput.location}</strong> ({irishInput.sqft} sq ft).
          </p>
        </div>

        {/* Middle Column: Top 3 Pain Points */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Trophy size={16} color="var(--accent-amber)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Top 3 Destinations To Question Life Decisions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {top3.map((comp, idx) => {
              const isActive = activeRowId === comp.city.id;
              return (
                <button
                  key={comp.city.id}
                  type="button"
                  onClick={() => onSelectCity(comp)}
                  onFocus={() => setActiveRowId(comp.city.id)}
                  onBlur={() => setActiveRowId((current) => (current === comp.city.id ? null : current))}
                  onMouseEnter={() => setActiveRowId(comp.city.id)}
                  onMouseLeave={() => setActiveRowId((current) => (current === comp.city.id ? null : current))}
                  aria-label={`Open detailed breakdown for ${comp.city.name}, remorse rating ${comp.remorseIndex} out of 100`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                    padding: '8px 12px',
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    outline: isActive ? '2px solid var(--accent-amber)' : 'none',
                    outlineOffset: '2px',
                    transition: prefersReducedMotion ? 'none' : 'background 0.2s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 800 }}>#{idx + 1}</span>
                    <span><span aria-hidden="true">{comp.city.flagEmoji} </span>{comp.city.name}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>{comp.spaceMultiplier}x Space</span>
                    <span className="badge badge-rose" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{comp.remorseIndex}/100</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Extreme Stat Highlights & Confetti Trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 700, marginBottom: '2px' }}>
              <Compass size={14} /> Maximum Space Out There
            </div>
            <div>
              In <strong style={{ color: '#fff' }}>{maxSpace?.city.name}</strong>, your budget buys <strong style={{ color: 'var(--accent-amber)' }}>{maxSpace?.spaceMultiplier}x</strong> floor space ({maxSpace?.estimatedSqM.toLocaleString()} m² / {maxSpace?.estimatedSqFt.toLocaleString()} sq ft)!
            </div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700, marginBottom: '2px' }}>
              <Sun size={14} /> Maximum Sun Exposure
            </div>
            <div>
              <strong style={{ color: '#fff' }}>{maxSun?.city.name}</strong> offers <strong style={{ color: 'var(--accent-amber)' }}>{maxSun?.city.sunnyDaysPerYear} sunny days</strong> per year (+{maxSun?.sunnyDaysDiff} vs Dublin rain).
            </div>
          </div>

          <button
            onClick={handleConfetti}
            className="btn btn-accent"
            style={{ width: '100%', padding: '10px' }}
          >
            <Beer size={16} /> I Accept My Fate (Trigger Confetti ☘️)
          </button>
        </div>

      </div>
    </div>
  );
};
