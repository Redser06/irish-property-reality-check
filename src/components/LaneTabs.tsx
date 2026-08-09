import React from 'react';
import { LaneFilter, RegionCategory } from '../types';
import { Compass, SlidersHorizontal } from 'lucide-react';

interface LaneTabsProps {
  activeLane: LaneFilter;
  onLaneChange: (lane: LaneFilter) => void;
  activeRegion: RegionCategory;
  onRegionChange: (region: RegionCategory) => void;
  sortBy: 'remorse' | 'space' | 'sun' | 'price';
  onSortChange: (sort: 'remorse' | 'space' | 'sun' | 'price') => void;
  resultsCount: number;
}

export const LaneTabs: React.FC<LaneTabsProps> = ({
  activeLane,
  onLaneChange,
  activeRegion,
  onRegionChange,
  sortBy,
  onSortChange,
  resultsCount
}) => {
  return (
    <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Main Lane Toggles */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => { onLaneChange('all'); onRegionChange('All'); }}
            className={`btn ${activeLane === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <Compass size={16} /> All Destinations ({resultsCount})
          </button>

          <button
            onClick={() => { onLaneChange('lane1'); onRegionChange('Ireland'); }}
            className={`btn ${activeLane === 'lane1' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            ☘️ Lane 1: Around Ireland (4)
          </button>

          <button
            onClick={() => { onLaneChange('lane2'); onRegionChange('All'); }}
            className={`btn ${activeLane === 'lane2' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            ✈️ Lane 2: International (18)
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'remorse' | 'space' | 'sun' | 'price')}
            className="input-field"
            style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto', background: 'rgba(15, 23, 42, 0.9)' }}
          >
            <option value="remorse">🔥 Existential Dread (Remorse Index)</option>
            <option value="space">📐 Biggest Space Multiplier</option>
            <option value="sun">☀️ Most Sunshine Days</option>
            <option value="price">💰 Lowest Price / Sq Meter</option>
          </select>
        </div>

      </div>

      {/* Sub-Region Filters (Visible when Lane 2 or All selected) */}
      {activeLane !== 'lane1' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Filter Region:
          </span>
          {(['All', 'UK & Europe', 'North America', 'Middle East', 'Australia'] as RegionCategory[]).map((region) => (
            <button
              key={region}
              onClick={() => onRegionChange(region)}
              className="badge"
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: '0.8rem',
                border: activeRegion === region ? '1px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                background: activeRegion === region ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeRegion === region ? '#34d399' : 'var(--text-secondary)'
              }}
            >
              {region}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
