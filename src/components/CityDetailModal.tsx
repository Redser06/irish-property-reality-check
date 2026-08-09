import React, { useState } from 'react';
import { ComparisonResult, IrishPropertyInput } from '../types';
import { X, Search, ExternalLink, Check, Copy, Flame } from 'lucide-react';

interface CityDetailModalProps {
  comparison: ComparisonResult;
  irishInput: IrishPropertyInput;
  onClose: () => void;
}

export const CityDetailModal: React.FC<CityDetailModalProps> = ({
  comparison,
  irishInput,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const { city, convertedPrice, estimatedSqFt, estimatedBeds, estimatedBaths, spaceMultiplier, remorseIndex, remorseLabel, sunnyDaysDiff, googleSearchUrl, portalSearchUrl } = comparison;

  const searchQueryText = `${estimatedBeds} bedroom house for sale ${city.name} ${city.currencySymbol}${convertedPrice.toLocaleString()}`;

  const handleCopySearch = () => {
    navigator.clipboard.writeText(searchQueryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <img
            src={city.imageUrl}
            alt={city.name}
            style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--accent-emerald)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>{city.flagEmoji}</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{city.name}, {city.country}</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Side-by-side comparison for <strong style={{ color: 'var(--accent-amber)' }}>€{irishInput.priceEur.toLocaleString()}</strong> budget
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Metric</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#34d399', width: '38%' }}>☘️ Irish Property</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--accent-amber)', width: '38%' }}>{city.flagEmoji} {city.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Budget</td>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>€{irishInput.priceEur.toLocaleString()} EUR</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  {city.currencySymbol}{convertedPrice.toLocaleString()} {city.currency}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Est. Floor Space</td>
                <td style={{ padding: '12px 16px' }}>{irishInput.sqft} sq ft</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#34d399' }}>
                  {estimatedSqFt.toLocaleString()} sq ft ({spaceMultiplier}x space)
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Bedrooms / Baths</td>
                <td style={{ padding: '12px 16px' }}>{irishInput.beds} Bed / {irishInput.baths} Bath</td>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                  ~{estimatedBeds} Bed / ~{estimatedBaths} Bath
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Price per m²</td>
                <td style={{ padding: '12px 16px' }}>€{Math.round(irishInput.priceEur / (irishInput.sqft / 10.7639)).toLocaleString()}/m²</td>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                  €{city.pricePerSqM.toLocaleString()}/m²
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Annual Sunshine</td>
                <td style={{ padding: '12px 16px' }}>140 Days (Dublin average)</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fbbf24' }}>
                  {city.sunnyDaysPerYear} Days ({sunnyDaysDiff > 0 ? `+${sunnyDaysDiff}` : sunnyDaysDiff})
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Typical Architecture</td>
                <td style={{ padding: '12px 16px' }}>{irishInput.propertyType} (BER {irishInput.berRating})</td>
                <td style={{ padding: '12px 16px' }}>{city.typicalBuilding}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Outdoor Amenity</td>
                <td style={{ padding: '12px 16px' }}>Small garden / balcony</td>
                <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 700 }}>
                  {city.samplePerks[0]}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Remorse Index Box */}
        <div style={{
          padding: '16px',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={18} /> Remorse Rating for {city.name}: {remorseIndex}/100
            </span>
            <span className="badge badge-rose">{remorseLabel}</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{city.sarcasticQuote}"
          </p>
        </div>

        {/* Live Search Query Generator */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} color="var(--accent-emerald)" /> Live Real Estate Search Query:
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={searchQueryText}
              className="input-field"
              style={{ background: 'rgba(15, 23, 42, 0.9)', fontSize: '0.85rem' }}
            />
            <button onClick={handleCopySearch} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '10px' }}>
              {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '10px 20px' }}
          >
            <Search size={16} /> Search Houses on Google
          </a>
          <a
            href={portalSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent"
            style={{ padding: '10px 20px' }}
          >
            <ExternalLink size={16} /> Open {city.portalName} Portal
          </a>
        </div>

      </div>
    </div>
  );
};
