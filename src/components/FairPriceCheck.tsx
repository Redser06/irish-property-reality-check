import React, { useMemo } from 'react';
import { Scale, AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { IrishPropertyInput } from '../types';
import { resolveIrishPlace } from '../data/irishBenchmarks';
import { SQFT_PER_SQM } from '../utils/comparatorEngine';
import {
  COMPASS_UNSOURCED_FALLBACK_PPSM,
  MIN_ASKING_PRICE_EUR,
  MIN_GRADE_SQM,
  VERDICT_COPY,
  deltaPercent,
  estimateFairBand,
  formatEuro,
  verdictForDelta,
  type FairVerdict,
} from '../utils/fairPrice';

interface FairPriceCheckProps {
  irishInput: IrishPropertyInput;
}

const VERDICT_COLOR: Record<FairVerdict, string> = {
  below: 'var(--accent-emerald)',
  fair: 'var(--accent-cyan)',
  above: 'var(--accent-amber)',
  overpriced: 'var(--accent-rose)',
};

function VerdictIcon({ verdict }: { verdict: FairVerdict }) {
  if (verdict === 'below') return <TrendingDown size={22} />;
  if (verdict === 'fair') return <Minus size={22} />;
  return <TrendingUp size={22} />;
}

export const FairPriceCheck: React.FC<FairPriceCheckProps> = ({ irishInput }) => {
  const grade = useMemo(() => {
    const sqm = Math.round((irishInput.sqft || 0) / SQFT_PER_SQM);
    const place = resolveIrishPlace(`${irishInput.location} ${irishInput.title}`);
    const asking = irishInput.priceEur;

    if (asking < MIN_ASKING_PRICE_EUR) {
      return { sqm, place, blocked: 'price' as const };
    }
    if (sqm < MIN_GRADE_SQM) {
      return { sqm, place, blocked: 'area' as const };
    }
    if (!place.benchmark) {
      return { sqm, place, blocked: 'benchmark' as const };
    }

    const band = estimateFairBand(place.benchmark.pricePerSqM, sqm);
    const delta = deltaPercent(asking, band.mid);
    return {
      sqm,
      place,
      blocked: null,
      band,
      delta,
      verdict: verdictForDelta(delta),
      impliedPpsm: Math.round(asking / sqm),
    };
  }, [irishInput]);

  const { place, sqm } = grade;
  const benchmark = place.benchmark;
  const placeLabel = benchmark?.label ?? place.county ?? 'this place';

  return (
    <section className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }} aria-label="Fair price check">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Scale size={20} color="var(--accent-cyan)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Fair Price Check</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '760px', marginBottom: '16px' }}>
        Grades {formatEuro(irishInput.priceEur)} in {irishInput.location} against a sourced local €/m² figure,
        using the ±8% band from Irish Property Compass. This is not a 24-month Property Price Register median,
        and it does not include stamp duty or Help to Buy — Compass did not calculate either.
      </p>

      {grade.blocked === 'price' && (
        <p style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
          Compass will not grade an asking price under {formatEuro(MIN_ASKING_PRICE_EUR)}.
        </p>
      )}

      {grade.blocked === 'area' && (
        <p style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
          Floor area works out at {sqm} m². Compass refuses a check under {MIN_GRADE_SQM} m².
        </p>
      )}

      {grade.blocked === 'benchmark' && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.32)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
        }}>
          <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '3px' }} />
            <span>
              {place.county
                ? <>No sourced €/m² is published here for <strong>{place.county}</strong>.</>
                : <>No county or Eircode routing key in “{irishInput.location}” matched a figure this app will stand over.</>}
              {' '}Compass would have substituted an unsourced{' '}
              {place.county === 'Wicklow'
                ? formatEuro(COMPASS_UNSOURCED_FALLBACK_PPSM.Wicklow)
                : place.county === 'Dublin'
                  ? formatEuro(COMPASS_UNSOURCED_FALLBACK_PPSM.Dublin)
                  : formatEuro(COMPASS_UNSOURCED_FALLBACK_PPSM.other)}
              /m². That number is not used.
            </span>
          </p>
        </div>
      )}

      {grade.blocked === null && benchmark && grade.band && grade.verdict && (
        <>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '14px 16px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${VERDICT_COLOR[grade.verdict]}`,
          }}>
            <span style={{ color: VERDICT_COLOR[grade.verdict], display: 'flex' }}>
              <VerdictIcon verdict={grade.verdict} />
            </span>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Verdict
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: VERDICT_COLOR[grade.verdict] }}>
                {VERDICT_COPY[grade.verdict].label}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
                {VERDICT_COPY[grade.verdict].text}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                vs benchmark
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: VERDICT_COLOR[grade.verdict] }}>
                {grade.delta >= 0 ? '+' : ''}{grade.delta.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '14px',
          }}>
            {[
              ['Asking', formatEuro(irishInput.priceEur)],
              ['Your €/m²', formatEuro(grade.impliedPpsm)],
              [`${placeLabel} €/m²`, formatEuro(benchmark.pricePerSqM)],
              ['Fair estimate', formatEuro(grade.band.mid)],
              ['Fair range', `${formatEuro(grade.band.low)} – ${formatEuro(grade.band.high)}`],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {label}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</div>
              </div>
            ))}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {sqm} m² from {irishInput.sqft.toLocaleString('en-IE')} sq ft.
            {' '}{placeLabel} benchmark is {formatEuro(benchmark.pricePerSqM)}/m² ({benchmark.basis}
            {benchmark.editorial ? ', editorial estimate' : ''}), as of {benchmark.asOf}. {benchmark.source}
            {benchmark.basis === 'apartment' && placeLabel === 'Dublin' && (
              <> Apartment €/m² runs above house €/m², so a house can look cheaper against this number than it is.</>
            )}
            {' '}Bedrooms are ignored, which is what Compass’s estimator did with them.
            {' '}No comparable-sale count is shown: there is no PPR cache in this app.
          </p>
        </>
      )}

      {place.routingKeyMismatch && place.countySource === 'routing-key' && (
        <p style={{ color: 'var(--accent-amber)', fontSize: '0.82rem', marginTop: '12px' }}>
          <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
          Routing key {place.routingKey} is {place.routingKeyMismatch.postTown}, Co. {place.routingKeyMismatch.listedCounty} on the
          public routing-area list ({place.routingKeyMismatch.source}). Compass maps it to {place.routingKeyMismatch.compassCounty},
          and this grade follows Compass.
        </p>
      )}

      {place.routingKeyMismatch && place.countySource === 'address' && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '12px' }}>
          Routing key {place.routingKey} is flagged: Compass would call it {place.routingKeyMismatch.compassCounty},
          the public list says {place.routingKeyMismatch.postTown}, Co. {place.routingKeyMismatch.listedCounty}.
          The county typed in the address was used instead.
        </p>
      )}
    </section>
  );
};
