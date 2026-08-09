import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ComparisonResult, IrishPropertyInput } from '../types';
import { X, Search, ExternalLink, Check, Copy, Flame, AlertTriangle } from 'lucide-react';

interface CityDetailModalProps {
  comparison: ComparisonResult;
  irishInput: IrishPropertyInput;
  onClose: () => void;
}

const SQFT_PER_SQM = 10.7639;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details > summary',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

type CopyState = 'idle' | 'copied' | 'failed';

export const CityDetailModal: React.FC<CityDetailModalProps> = ({
  comparison,
  irishInput,
  onClose
}) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [thumbFailed, setThumbFailed] = useState(false);
  const [closeFocused, setCloseFocused] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest onClose without re-running the focus-management effect
  // (a new inline callback from the parent must not steal focus mid-interaction).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const titleId = useId();

  const { city, convertedPrice, estimatedSqM, estimatedSqFt, estimatedBeds, estimatedBaths, spaceMultiplier, remorseIndex, remorseLabel, sunnyDaysDiff, googleSearchUrl, portalSearchUrl } = comparison;

  const searchQueryText = `${estimatedBeds} bedroom house for sale ${city.name} ${city.currencySymbol}${convertedPrice.toLocaleString()}`;

  // Irish floor area in m², plus price per m² from the unrounded value so the
  // figure stays accurate even though we display a rounded area.
  const irishSqMExact = irishInput.sqft > 0 ? irishInput.sqft / SQFT_PER_SQM : 0;
  const irishSqM = Math.round(irishSqMExact);
  const irishPricePerSqM = irishSqMExact > 0
    ? Math.round(irishInput.priceEur / irishSqMExact).toLocaleString()
    : '—';

  /* ---------------------------------------------------------------------
   * Accessibility: dialog semantics, Escape to close, focus trap + return
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const dialogNode = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog so keyboard and screen reader users land here.
    dialogNode?.focus();

    const getFocusable = (): HTMLElement[] => {
      if (!dialogNode) return [];
      return Array.from(dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogNode) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogNode.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const activeIsInside = !!active && dialogNode.contains(active) && active !== dialogNode;

      if (event.shiftKey) {
        if (!activeIsInside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!activeIsInside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Return focus to whatever opened the dialog, if it is still on the page.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  // Never leave a copy timer running after unmount.
  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  /* ---------------------------------------------------------------------
   * Clipboard: feature-detected, with a legacy fallback and guaranteed reset
   * ------------------------------------------------------------------ */
  const flagCopyResult = useCallback((state: CopyState) => {
    setCopyState(state);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopyState('idle'), 2500);
  }, []);

  const legacyCopy = useCallback((): boolean => {
    const input = searchInputRef.current;
    if (!input || typeof document.execCommand !== 'function') return false;
    try {
      input.focus();
      input.select();
      input.setSelectionRange(0, searchQueryText.length);
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }, [searchQueryText]);

  const handleCopySearch = useCallback(async () => {
    const canUseAsyncClipboard =
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function';

    if (canUseAsyncClipboard) {
      try {
        await navigator.clipboard.writeText(searchQueryText);
        flagCopyResult('copied');
        return;
      } catch {
        // Permission denied or insecure context — fall through to the legacy path.
      }
    }

    // Fallback: select the text and try execCommand. If even that fails we leave
    // the query selected so the user can copy it manually.
    flagCopyResult(legacyCopy() ? 'copied' : 'failed');
  }, [searchQueryText, flagCopyResult, legacyCopy]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ outline: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${city.name} detail`}
          onFocus={() => setCloseFocused(true)}
          onBlur={() => setCloseFocused(false)}
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
            justifyContent: 'center',
            outline: closeFocused ? '2px solid var(--accent-amber)' : 'none',
            outlineOffset: '2px'
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {thumbFailed ? (
            <div
              role="img"
              aria-label={`${city.name} photo unavailable`}
              style={{
                width: '80px',
                height: '80px',
                flexShrink: 0,
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--accent-emerald)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.95) 75%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                lineHeight: 1
              }}
            >
              <span aria-hidden="true">{city.flagEmoji}</span>
            </div>
          ) : (
            <img
              src={city.imageUrl}
              alt={city.name}
              width={80}
              height={80}
              onError={() => setThumbFailed(true)}
              style={{ width: '80px', height: '80px', flexShrink: 0, aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--accent-emerald)' }}
            />
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }} aria-hidden="true">{city.flagEmoji}</span>
              <h2 id={titleId} style={{ fontSize: '1.8rem', fontWeight: 800 }}>{city.name}, {city.country}</h2>
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
                <td style={{ padding: '12px 16px' }}>
                  {irishSqM.toLocaleString()} m²
                  <span style={{ color: 'var(--text-muted)' }}> ({irishInput.sqft.toLocaleString()} sq ft)</span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#34d399' }}>
                  {estimatedSqM.toLocaleString()} m²
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> ({estimatedSqFt.toLocaleString()} sq ft)</span>
                  {' '}({spaceMultiplier}x space)
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
                <td style={{ padding: '12px 16px' }}>€{irishPricePerSqM}/m²</td>
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
              <Flame size={18} aria-hidden="true" /> Remorse Rating for {city.name}: {remorseIndex}/100
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
            <Search size={16} color="var(--accent-emerald)" aria-hidden="true" /> Live Real Estate Search Query:
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              ref={searchInputRef}
              type="text"
              readOnly
              value={searchQueryText}
              aria-label="Generated real estate search query"
              className="input-field"
              style={{ background: 'rgba(15, 23, 42, 0.9)', fontSize: '0.85rem' }}
            />
            <button
              type="button"
              onClick={handleCopySearch}
              className="btn btn-secondary"
              aria-label="Copy search query to clipboard"
              style={{ fontSize: '0.8rem', padding: '10px' }}
            >
              {copyState === 'copied' ? (
                <Check size={16} color="#34d399" aria-hidden="true" />
              ) : copyState === 'failed' ? (
                <AlertTriangle size={16} color="var(--accent-amber)" aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          <p aria-live="polite" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', minHeight: '1.1em' }}>
            {copyState === 'copied' && 'Copied to clipboard.'}
            {copyState === 'failed' && 'Could not reach the clipboard — the query is selected, press Ctrl/Cmd + C to copy it.'}
          </p>
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
            <Search size={16} aria-hidden="true" /> Search Houses on Google
          </a>
          <a
            href={portalSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent"
            style={{ padding: '10px 20px' }}
          >
            <ExternalLink size={16} aria-hidden="true" /> Open {city.portalName} Portal
          </a>
        </div>

      </div>
    </div>
  );
};
