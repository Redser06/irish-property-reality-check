import React, { useState } from 'react';
import { Search, Link as LinkIcon, Euro, Bed, Maximize2, MapPin, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { FieldConfidence, InputConfidence, IrishPropertyInput, PresetProperty } from '../types';
import { PRESET_PROPERTIES } from '../data/citiesData';
import { parseIrishPropertyInput } from '../utils/comparatorEngine';
import { fetchListingMeta, mergeListingMeta } from '../utils/listingMeta';

interface ParseNotice {
  tone: 'good' | 'warn' | 'bad';
  read: string[];
  missing: string[];
  warning?: string;
  areaUnknown: boolean;
}

interface PropertyInputFormProps {
  currentInput: IrishPropertyInput;
  /**
   * `confidence` travels with the input so downstream cards can tell a value the
   * app READ from a value it GUESSED. Passing the input alone is how the original
   * silent-stale-numbers bug worked.
   */
  onInputChange: (newInput: IrishPropertyInput, confidence: InputConfidence) => void;
  currentConfidence: InputConfidence;
}

const NOTICE_TONES = {
  good: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', accent: 'var(--accent-emerald)' },
  warn: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.32)', accent: 'var(--accent-amber)' },
  bad: { bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.32)', accent: 'var(--accent-rose)' }
} as const;

/** A parsed field is only 'read' if the parser actually found it in the input. */
function confidenceFromParse(
  extracted: { price: boolean; beds: boolean; area: boolean },
  isUrl: boolean,
): InputConfidence {
  const flag = (found: boolean): FieldConfidence => (found ? 'read' : 'assumed');
  return {
    price: flag(extracted.price),
    beds: flag(extracted.beds),
    area: flag(extracted.area),
    source: isUrl ? 'url-slug' : 'free-text',
  };
}

export const PropertyInputForm: React.FC<PropertyInputFormProps> = ({
  currentInput,
  currentConfidence,
  onInputChange
}) => {
  const [urlOrText, setUrlOrText] = useState<string>('');
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [notice, setNotice] = useState<ParseNotice | null>(null);
  const [highlightArea, setHighlightArea] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const handleParseInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlOrText.trim()) {
      setNotice(null);
      setHighlightArea(false);
      return;
    }

    const local = parseIrishPropertyInput(urlOrText, currentInput);

    // For a URL, ask our own function to read the listing's Open Graph tags. This
    // can only ever ADD to what the local parser managed; if it is blocked, slow,
    // or not deployed, `result` stays exactly as it is now.
    let result = local;
    let usedOg = false;
    if (local.isUrl) {
      setIsFetching(true);
      const meta = await fetchListingMeta(urlOrText);
      setIsFetching(false);
      const merged = mergeListingMeta(local, meta);
      usedOg = merged !== local && (meta?.ok ?? false);
      result = merged;
    }

    const { input, extracted, isUrl, warning } = result;

    const read: string[] = [];
    if (extracted.price) read.push(`€${input.priceEur.toLocaleString()}`);
    if (extracted.beds) read.push(`${input.beds} bed${input.beds === 1 ? '' : 's'}`);
    if (extracted.area) read.push(`${input.sqft.toLocaleString()} sq ft`);

    const missing: string[] = [];
    if (!extracted.price) missing.push(`price — sticking with €${input.priceEur.toLocaleString()}`);
    if (!extracted.beds) missing.push(`bed count — sticking with ${input.beds}`);
    if (!extracted.area) missing.push(`floor area — assuming ${input.sqft.toLocaleString()} sq ft`);

    const tone: ParseNotice['tone'] = warning || read.length === 0 ? 'bad' : missing.length > 0 ? 'warn' : 'good';

    setNotice({ tone, read, missing, warning, areaUnknown: !extracted.area });

    // The whole comparison hinges on floor area. If a pasted listing didn't give
    // us one, open the manual panel and point at the field rather than quietly
    // reusing whatever was there before.
    if (!extracted.area && isUrl) {
      setIsCustomizing(true);
      setHighlightArea(true);
    } else {
      setHighlightArea(false);
    }

    onInputChange(input, {
      ...confidenceFromParse(extracted, isUrl),
      source: usedOg ? 'og' : isUrl ? 'url-slug' : 'free-text',
    });
  };

  const handlePresetSelect = (preset: PresetProperty) => {
    setUrlOrText('');
    setNotice(null);
    setHighlightArea(false);
    onInputChange(preset.input, { price: 'preset', beds: 'preset', area: 'preset', source: 'preset' });
  };

  /**
   * A manual edit upgrades only the field that was edited. Correcting the floor
   * area must not imply the price was verified too.
   */
  const handleManualEdit = (patch: Partial<IrishPropertyInput>, field?: keyof Omit<InputConfidence, 'source'>) => {
    const nextConfidence: InputConfidence = field
      ? { ...currentConfidence, [field]: 'entered', source: 'manual' }
      : { ...currentConfidence, source: 'manual' };
    onInputChange({ ...currentInput, ...patch }, nextConfidence);
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
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '12px 24px' }}
            disabled={isFetching}
            aria-busy={isFetching}
          >
            <Sparkles size={18} /> {isFetching ? 'Reading the listing…' : 'Reality Check Me!'}
          </button>
        </div>
      </form>

      {/* Parse Honesty Notice — exactly what we managed to read, and what we made up */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            background: NOTICE_TONES[notice.tone].bg,
            border: `1px solid ${NOTICE_TONES[notice.tone].border}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            lineHeight: 1.55
          }}
        >
          <span style={{ flexShrink: 0, marginTop: '2px' }}>
            {notice.tone === 'good'
              ? <CheckCircle2 size={18} color={NOTICE_TONES.good.accent} />
              : <AlertTriangle size={18} color={NOTICE_TONES[notice.tone].accent} />}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            {notice.warning && (
              <p style={{ fontWeight: 700, color: NOTICE_TONES[notice.tone].accent, marginBottom: notice.read.length || notice.missing.length ? '6px' : 0 }}>
                {notice.warning}
              </p>
            )}

            {notice.read.length > 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: NOTICE_TONES[notice.tone].accent }}>Read from your input:</strong>{' '}
                {notice.read.join(', ')}.
              </p>
            )}

            {notice.read.length === 0 && !notice.warning && (
              <p style={{ fontWeight: 700, color: NOTICE_TONES.bad.accent }}>
                Couldn't read a single thing from that. Every number below is still the last one you picked.
              </p>
            )}

            {notice.missing.length > 0 && (
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                Couldn't read the {notice.missing.join('; ')}.
              </p>
            )}

            {notice.areaUnknown && (
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                Floor area drives every comparison on this page, so an assumed one makes the whole thing
                a confident work of fiction. Pop the real number into <strong style={{ color: 'var(--accent-amber)' }}>Approx Floor Space</strong> below.
                {!isCustomizing && (
                  <>
                    {' '}
                    <button
                      onClick={() => { setIsCustomizing(true); setHighlightArea(true); }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '3px 10px', marginLeft: '4px', verticalAlign: 'middle' }}
                    >
                      Open Fine-Tune Specs
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss parse notice"
            title="Dismiss"
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              lineHeight: 0
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
              onChange={(e) => handleManualEdit({ priceEur: Math.max(50000, parseInt(e.target.value) || 0) }, 'price')}
              className="input-field"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Bedrooms</label>
            <input
              type="number"
              value={currentInput.beds}
              onChange={(e) => handleManualEdit({ beds: Math.max(1, parseInt(e.target.value) || 1) }, 'beds')}
              className="input-field"
            />
          </div>
          <div>
            <label
              htmlFor="floor-area-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem',
                color: highlightArea ? 'var(--accent-amber)' : 'var(--text-muted)',
                fontWeight: highlightArea ? 700 : 400,
                marginBottom: '4px'
              }}
            >
              {highlightArea && <AlertTriangle size={13} />}
              Approx Floor Space (Sq Ft)
            </label>
            <input
              id="floor-area-input"
              type="number"
              value={currentInput.sqft}
              onChange={(e) => {
                setHighlightArea(false);
                handleManualEdit({ sqft: Math.max(200, parseInt(e.target.value) || 500) }, 'area');
              }}
              className="input-field"
              autoFocus={highlightArea}
              style={highlightArea ? {
                borderColor: 'var(--accent-amber)',
                boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.22)'
              } : undefined}
            />
            {highlightArea && (
              <p style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', marginTop: '4px' }}>
                Guessed, not read. Fix this one and the rest stops lying.
              </p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location in Ireland</label>
            <input
              type="text"
              value={currentInput.location}
              onChange={(e) => handleManualEdit({ location: e.target.value })}
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
