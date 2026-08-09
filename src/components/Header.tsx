import React from 'react';
import { Home, Globe, Sparkles } from 'lucide-react';
import { CITIES_DATA } from '../data/citiesData';

// Counts are derived from the data, never hardcoded — add a city and the badges follow.
const LANE_1_COUNT = CITIES_DATA.filter((c) => c.lane === 1).length;
const LANE_2_COUNT = CITIES_DATA.filter((c) => c.lane === 2).length;

export const Header: React.FC = () => {
  return (
    <header className="glass-panel" style={{ padding: '24px 32px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>☘️</span>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #34d399 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Irish Property Reality Check
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
                Housing Buyer's Remorse & Global Property Comparator
              </p>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '780px' }}>
            Ever wondered what your €550k Dublin 2-bed terraced house with a damp wall buys in Bordeaux, Dubai, Sydney, or Galway? 
            Compare housing specs, weather stats, and existential dread metrics with live portal search links!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className="badge badge-emerald" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <Home size={16} /> Lane 1: {LANE_1_COUNT} Irish Cities
          </div>
          <div className="badge badge-amber" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <Globe size={16} /> Lane 2: {LANE_2_COUNT} Global Cities
          </div>
          <div className="badge badge-purple" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <Sparkles size={16} /> Direct Google Portal Search
          </div>
        </div>
      </div>
    </header>
  );
};
