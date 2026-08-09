import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { PropertyInputForm } from './components/PropertyInputForm';
import { RemorseDashboard } from './components/RemorseDashboard';
import { LaneTabs } from './components/LaneTabs';
import { CityCard } from './components/CityCard';
import { CityDetailModal } from './components/CityDetailModal';
import { IrishPropertyInput, LaneFilter, RegionCategory, ComparisonResult } from './types';
import { CITIES_DATA, PRESET_PROPERTIES } from './data/citiesData';
import { calculateComparison } from './utils/comparatorEngine';

export const App: React.FC = () => {
  // Default property input (€550k Dublin 2-Bed)
  const [irishInput, setIrishInput] = useState<IrishPropertyInput>(PRESET_PROPERTIES[0].input);

  // Filters & Sorting
  const [activeLane, setActiveLane] = useState<LaneFilter>('all');
  const [activeRegion, setActiveRegion] = useState<RegionCategory>('All');
  const [sortBy, setSortBy] = useState<'remorse' | 'space' | 'sun' | 'price'>('remorse');

  // Selected Modal
  const [selectedCityModal, setSelectedCityModal] = useState<ComparisonResult | null>(null);

  // Compute comparisons for all cities
  const allComparisons = useMemo(() => {
    return CITIES_DATA.map((city) => calculateComparison(irishInput, city));
  }, [irishInput]);

  // Filtered & Sorted comparisons
  const filteredComparisons = useMemo(() => {
    let result = [...allComparisons];

    // Filter by Lane
    if (activeLane === 'lane1') {
      result = result.filter((c) => c.city.lane === 1);
    } else if (activeLane === 'lane2') {
      result = result.filter((c) => c.city.lane === 2);
    }

    // Filter by Region
    if (activeRegion !== 'All') {
      result = result.filter((c) => c.city.region === activeRegion);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'remorse') {
        return b.remorseIndex - a.remorseIndex;
      }
      if (sortBy === 'space') {
        return b.spaceMultiplier - a.spaceMultiplier;
      }
      if (sortBy === 'sun') {
        return b.city.sunnyDaysPerYear - a.city.sunnyDaysPerYear;
      }
      if (sortBy === 'price') {
        return a.city.pricePerSqM - b.city.pricePerSqM;
      }
      return 0;
    });

    return result;
  }, [allComparisons, activeLane, activeRegion, sortBy]);

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header />

      {/* Main Input Form */}
      <PropertyInputForm
        currentInput={irishInput}
        onInputChange={setIrishInput}
      />

      {/* Remorse Dashboard Gauge */}
      <RemorseDashboard
        comparisons={allComparisons}
        irishInput={irishInput}
        onSelectCity={setSelectedCityModal}
      />

      {/* Lane Tabs & Controls */}
      <LaneTabs
        activeLane={activeLane}
        onLaneChange={setActiveLane}
        activeRegion={activeRegion}
        onRegionChange={setActiveRegion}
        sortBy={sortBy}
        onSortChange={setSortBy}
        resultsCount={filteredComparisons.length}
      />

      {/* Comparison Grid */}
      <main className="comparison-grid">
        {filteredComparisons.map((comparison) => (
          <CityCard
            key={comparison.city.id}
            comparison={comparison}
            onSelectCity={setSelectedCityModal}
          />
        ))}
      </main>

      {/* Modal Detail View */}
      {selectedCityModal && (
        <CityDetailModal
          comparison={selectedCityModal}
          irishInput={irishInput}
          onClose={() => setSelectedCityModal(null)}
        />
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '60px',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p style={{ marginBottom: '6px' }}>
          ☘️ <strong>Irish Property Reality Check App</strong> — Comparing Dublin & Irish housing budgets across 22 global cities.
        </p>
        <p style={{ fontSize: '0.75rem' }}>
          Estimates are based on average city price/m² benchmarks, real-time portal query structures, and satirical existential calculations.
        </p>
      </footer>
    </div>
  );
};

export default App;
