import React, { useState } from 'react';
import { ComparisonResult } from '../types';
import { Search, ExternalLink, Sun, Maximize2, Bed, Bath, Flame, Beer, ArrowRight, AlertTriangle } from 'lucide-react';

interface CityCardProps {
  comparison: ComparisonResult;
  onSelectCity: (comparison: ComparisonResult) => void;
}

/**
 * guinnessEquivPints is the monetary value of the space difference expressed in
 * pints, so it can be negative (budget buys less space than at home) and runs to
 * tens of thousands. Abbreviate above 10k so the badge never overflows the card,
 * and always take the sign from the value rather than hardcoding a "+".
 */
const formatPints = (pints: number): string => {
  const rounded = Math.round(pints);
  const abs = Math.abs(rounded);

  if (abs >= 1_000_000) {
    return `${Number((abs / 1_000_000).toFixed(1)).toLocaleString()}m`;
  }
  if (abs >= 10_000) {
    return `${Number((abs / 1_000).toFixed(1)).toLocaleString()}k`;
  }
  return abs.toLocaleString();
};

export const CityCard: React.FC<CityCardProps> = ({ comparison, onSelectCity }) => {
  const { city, convertedPrice, estimatedSqM, estimatedSqFt, estimatedBeds, estimatedBaths, spaceMultiplier, remorseIndex, sunnyDaysDiff, provenance, ownership } = comparison;

  const [imageFailed, setImageFailed] = useState(false);

  const isHighRemorse = remorseIndex >= 70;
  const pints = comparison.guinnessEquivPints;

  return (
    <div className={`glass-card ${isHighRemorse ? 'high-remorse-border' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* City Header Image */}
      {/* Fixed-height, non-shrinking box reserves the image space before it loads */}
      <div style={{ position: 'relative', height: '180px', minHeight: '180px', width: '100%', flexShrink: 0, overflow: 'hidden' }}>
        {imageFailed ? (
          <div
            role="img"
            aria-label={`${city.name} photo unavailable`}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              // Clear the gradient + city title that sit over the bottom of this box.
              paddingBottom: '52px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.95) 70%)'
            }}
          >
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">{city.flagEmoji}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Postcard lost in the post
            </span>
          </div>
        ) : (
          <img
            src={city.imageUrl}
            alt={city.name}
            width={640}
            height={360}
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
            loading="lazy"
          />
        )}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.3) 60%, transparent 100%)'
        }} />

        {/* Top Badges */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="badge badge-emerald" style={{ background: 'rgba(11, 15, 25, 0.8)', backdropFilter: 'blur(8px)', fontSize: '0.8rem' }}>
            {city.flagEmoji} {city.country}
          </span>
          <span className={`badge ${isHighRemorse ? 'badge-rose' : spaceMultiplier > 1.2 ? 'badge-amber' : 'badge-purple'}`} style={{ backdropFilter: 'blur(8px)' }}>
            <Flame size={14} /> Dread: {remorseIndex}/100
          </span>
        </div>

        {/* City Title */}
        <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {city.name}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: 700 }}>
              {city.lane === 1 ? '☘️ Lane 1 (Ireland)' : '✈️ Lane 2 (Global)'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* Estimated Price & Space Stats */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Budget in Local Currency
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                {city.currencySymbol}{convertedPrice.toLocaleString()} {city.currency}
              </div>
            </div>
            
            {/* Space Multiplier Pill */}
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${spaceMultiplier >= 1.5 ? 'badge-emerald' : spaceMultiplier >= 1.0 ? 'badge-amber' : 'badge-purple'}`} style={{ fontSize: '0.85rem', padding: '6px 10px' }}>
                <Maximize2 size={14} /> {spaceMultiplier}x {spaceMultiplier >= 1.0 ? 'Bigger' : 'Cozy'}
              </span>
            </div>
          </div>

          {/* Room Specs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            marginBottom: '14px'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Est. Beds</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Bed size={14} color="var(--accent-emerald)" /> {estimatedBeds}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Est. Baths</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Bath size={14} color="var(--accent-cyan)" /> {estimatedBaths}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Floor Space</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                {estimatedSqM.toLocaleString()} m²
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {estimatedSqFt.toLocaleString()} sq ft
              </div>
            </div>
          </div>

          {/* True cost of holding. Sticker price hides an order-of-magnitude
              difference in recurring property tax between countries. */}
          {ownership && (
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '8px 10px', marginBottom: '12px',
                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.78rem'
              }}
              title={`${ownership.breakdown.map((b) => `${b.label}: EUR ${b.annualEur.toLocaleString()}/yr`).join('\n')}\n\nUpfront taxes and fees: EUR ${ownership.upfrontEur.toLocaleString()}\n\n${ownership.source}`}
            >
              <span style={{ color: 'var(--text-muted)' }}>True cost to hold</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                €{ownership.annualEur.toLocaleString()}/yr
              </span>
            </div>
          )}

          {/* Confidence chip. Only shown when the figures above deserve a caveat —
              a badge on every card would be noise, and noise gets ignored. */}
          {provenance.overall !== 'high' && (
            <div
              className="badge"
              title={provenance.caveats.join('\n')}
              style={{
                display: 'inline-flex',
                marginBottom: '10px',
                fontSize: '0.72rem',
                background: provenance.overall === 'low' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: provenance.overall === 'low' ? 'var(--accent-rose)' : '#fbbf24',
                border: `1px solid ${provenance.overall === 'low' ? 'rgba(244, 63, 94, 0.28)' : 'rgba(245, 158, 11, 0.28)'}`
              }}
            >
              <AlertTriangle size={12} />
              {provenance.input.area === 'assumed'
                ? 'Floor area assumed'
                : provenance.band.band.confidence === 'estimated'
                  ? 'Estimated price data'
                  : 'Indicative only'}
            </div>
          )}

          {/* Weather and Guinness Indicators */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.75rem' }}>
              <Sun size={13} /> {city.sunnyDaysPerYear} Sunny Days ({sunnyDaysDiff > 0 ? `+${sunnyDaysDiff}` : sunnyDaysDiff} vs Dublin)
            </div>
            {spaceMultiplier > 1.2 && (
              <div
                className="badge"
                title={`${pints > 0 ? '+' : ''}${Math.round(pints).toLocaleString()} pints of space value`}
                style={
                  pints < 0
                    ? { background: 'rgba(244, 63, 94, 0.12)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.25)', fontSize: '0.75rem', maxWidth: '100%' }
                    : { background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)', fontSize: '0.75rem', maxWidth: '100%' }
                }
              >
                <Beer size={13} aria-hidden="true" />
                {pints > 0 && <>+{formatPints(pints)} Pints of Space Value</>}
                {pints < 0 && <>-{formatPints(pints)} Pints of Space Value</>}
                {pints === 0 && <>Level pegging on space value</>}
              </div>
            )}
          </div>

          {/* Sarcastic Reality Check Quote */}
          <div style={{
            background: 'rgba(244, 63, 94, 0.06)',
            borderLeft: '3px solid var(--accent-rose)',
            padding: '10px 12px',
            borderRadius: '0 8px 8px 0',
            fontSize: '0.85rem',
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>
            "{city.sarcasticQuote}"
          </div>
        </div>

        {/* Action Buttons: Live Google Search, Portal Link & Modal view */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={comparison.googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
              title="Search Google for houses matching this budget in this city"
            >
              <Search size={14} color="var(--accent-emerald)" /> Google Listings
            </a>

            <a
              href={comparison.portalSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
              title={`Open ${city.portalName} search portal`}
            >
              <ExternalLink size={14} color="var(--accent-amber)" /> {city.portalName}
            </a>
          </div>

          <button
            onClick={() => onSelectCity(comparison)}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '0.85rem', padding: '9px' }}
          >
            Detailed Reality Breakdown <ArrowRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
};
