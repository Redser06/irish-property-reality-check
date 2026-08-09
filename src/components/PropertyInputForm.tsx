import React, { useState } from 'react';
import { Search, Link as LinkIcon, Euro, Bed, Maximize2, MapPin, Sparkles, RefreshCw } from 'lucide-react';
import { IrishPropertyInput, PresetProperty } from '../types';
import { PRESET_PROPERTIES } from '../data/citiesData';
import { parseIrishPropertyInput } from '../utils/comparatorEngine';

interface PropertyInputFormProps {
  currentInput: IrishPropertyInput;
  onInputChange: (newInput: IrishPropertyInput) => void;
}

export const PropertyInputForm: React.FC<PropertyInputFormProps> = ({
  currentInput,
  onInputChange
}) => {
  const [urlOrText, setUrlOrText] = useState<string>('');
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);

  const handleParseInput = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = parseIrishPropertyInput(urlOrText, currentInput);
    onInputChange(updated);
  };

  const handlePresetSelect = (preset: PresetProperty) => {
    setUrlOrText('');
    onInputChange(preset.input);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LinkIcon size={20} color="var(--accent-emerald)" />
          Step 1: Input Your Irish House URL or Property Specs
        </h2>
        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="btn btn-secondary"
          style={{ fontSize: '0.85rem', padding: '6px 12px' }}
        >
          <RefreshCw size={14} /> {isCustomizing ? 'Hide Manual Controls' : 'Fine-Tune Specs'}
        </button>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleParseInput} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              value={urlOrText}
              onChange={(e) => setUrlOrText(e.target.value)}
              placeholder="Paste Daft.ie link or type details (e.g., '€600k 3 bed house in Dublin')..."
              className="input-field"
              style={{ paddingLeft: '44px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            <Sparkles size={18} /> Reality Check Me!
          </button>
        </div>
      </form>

      {/* Presets Row */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
          OR SELECT A DUBLIN / IRISH REALITY PRESET:
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {PRESET_PROPERTIES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className="btn btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '8px 14px',
                borderColor: currentInput.priceEur === preset.input.priceEur ? 'var(--accent-emerald)' : 'var(--border-color)',
                background: currentInput.priceEur === preset.input.priceEur ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              ☘️ {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Adjustments Panel */}
      {isCustomizing && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Price (€ EUR)</label>
            <input
              type="number"
              value={currentInput.priceEur}
              onChange={(e) => onInputChange({ ...currentInput, priceEur: Math.max(50000, parseInt(e.target.value) || 0) })}
              className="input-field"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Bedrooms</label>
            <input
              type="number"
              value={currentInput.beds}
              onChange={(e) => onInputChange({ ...currentInput, beds: Math.max(1, parseInt(e.target.value) || 1) })}
              className="input-field"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Approx Floor Space (Sq Ft)</label>
            <input
              type="number"
              value={currentInput.sqft}
              onChange={(e) => onInputChange({ ...currentInput, sqft: Math.max(200, parseInt(e.target.value) || 500) })}
              className="input-field"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location in Ireland</label>
            <input
              type="text"
              value={currentInput.location}
              onChange={(e) => onInputChange({ ...currentInput, location: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      )}

      {/* Active Profile Summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 18px',
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 'var(--radius-sm)',
        flexWrap: 'wrap'
      }}>
        <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>
          Comparing Target Budget:
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
            <Euro size={16} color="var(--accent-amber)" /> €{currentInput.priceEur.toLocaleString()}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Bed size={16} /> {currentInput.beds} Beds
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Maximize2 size={16} /> {currentInput.sqft} sq ft
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <MapPin size={16} /> {currentInput.location}
          </span>
          <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>
            BER: {currentInput.berRating}
          </span>
        </div>
      </div>
    </div>
  );
};
