# Porting guide: `irish-property-reality-check` ↔ `irish-property-compass`

**Audience:** an LLM or developer working on `github.com/Redser06/irish-property-compass` (private).

**This guide is self-contained.** Compass is not checked out on the author's machine — it previously lived under "Vibe Coding Projects", which moved to an external SSD and did not survive. Clone it before starting:

```bash
git clone git@github.com:Redser06/irish-property-compass.git
```

## Before anything else: rotate the Supabase keys

`irish-property-compass` has a **`.env` file committed to the repository**. It is private, but committed secrets should be treated as exposed. Rotate the Supabase keys, add `.env` to `.gitignore`, and remove it from the working tree before doing any other work. Purging it from history is a separate decision — rotation is the part that actually matters.

---

## The two apps share one primitive

Both answer a version of the same question: **what is a square metre worth here, and how confident are we?**

| | reality-check | compass |
|---|---|---|
| Question | What does my budget buy *elsewhere*? | Is *this* property fairly priced *here*? |
| Geography | 25 world cities | Irish Eircode routing keys |
| Data | CSO PxStat, ECB, published indices | PPR, BER, CSO RPPI via Supabase edge functions |
| Backend | One Vercel function, no DB | Supabase Postgres + Deno edge functions |

Because the primitive is shared, **the porting runs both ways.** Compass has the better Irish ingestion; reality-check has the better honesty model. Neither should reinvent the other's half.

---

## Part 1 — Port FROM reality-check TO compass

### 1.1 The parse-honesty contract (highest value — do this first)

**The problem it solves, which compass has today.** `src/hooks/useProperties.ts` in compass is documented as synthesising beds, baths, m² and lat/lng from PPR price and location via a deterministic heuristic, because the register lacks them. That is *exactly* the failure reality-check shipped and then fixed: a value the app **guessed** rendered identically to a value it **read**. It matters more in a valuation tool than in a satire one — a user acting on "this property is 12% overpriced" deserves to know the m² underneath it was inferred.

**What to port** — `src/types/index.ts` and `src/utils/comparatorEngine.ts`:

```ts
export type FieldConfidence = 'read' | 'entered' | 'preset' | 'assumed';

export interface InputConfidence {
  price: FieldConfidence;
  beds: FieldConfidence;
  area: FieldConfidence;
  source: 'og' | 'url-slug' | 'free-text' | 'manual' | 'preset';
}
```

Three rules that make it work, all learned the hard way:

1. **Confidence travels with the value.** The original bug was `onInputChange(input)` dropping the flags at the form boundary, so nothing downstream could tell guessed from read. Widen the callback: `onInputChange(input, confidence)`.
2. **A manual edit upgrades only the field edited.** Correcting floor area must not imply the price was verified.
3. **Roll up as the weakest link, and let floor area dominate.** It is the divisor on both sides of any per-m² comparison, so an assumed area makes every derived figure soft no matter how good the price data is.

In compass this maps directly onto `FairPrice.tsx`: the verdict bands (`<-8%` Underpriced → Fair → Above Market → Overpriced) should carry a confidence chip, and a synthesised m² should force the confidence down.

### 1.2 The provenance model

`PriceBand` in `src/types/index.ts`:

```ts
export interface PriceBand {
  pricePerSqM: number;
  basis: 'house' | 'apartment' | 'all-dwellings' | 'blended';
  source: string;      // a named, checkable citation — never "internal data"
  asOf: string;        // YYYY-MM-DD
  confidence: 'measured' | 'indexed' | 'estimated';
  sampleSize?: number;
}
```

Compass's `estimate_fair_price` RPC already returns `comp_count` and `median_ppsm`. **`comp_count` *is* `sampleSize`** — it just needs the label and the surrounding fields. A fair-price verdict computed from 4 comparables and one computed from 400 must not look the same on screen.

`confidence` semantics: `measured` = recorded transactions; `indexed` = asking prices or aggregates; `estimated` = editorial judgement. Compass's PPR-derived figures are genuinely `measured`, which is a stronger position than anything reality-check has — but only if the m² denominator is real rather than synthesised. Where the floor area comes from a BER join, say `measured`. Where it comes from the bedroom-band heuristic, say `indexed` at best.

### 1.3 The basis trap — read this even if you port nothing else

Apartment €/m² runs **materially above** house €/m² in the same city, because a house spreads its price over more floor area. reality-check nearly shipped a version where ten cities were re-sourced onto apartment data while others used all-dwellings medians. It was caught only because the corrections looked odd against the archetypes: Perth +96%, Brisbane +68%, Galway +47%, all for cities described as bungalows and villas.

Live CSO data has since confirmed the direction empirically:

| City | House €/m² | Apartment €/m² | Apartment premium |
|---|---|---|---|
| Galway | 4,151 | 4,685 | +13% |
| Cork | 3,358 | 3,959 | +18% |
| Limerick | 3,037 | 2,898 | −5% |

**Compass is more exposed to this than reality-check**, because its `enrich_properties_from_ber()` migration classifies dwellings as Detached / Semi-D / Terraced / Apartment. Any median `ppsm` computed across a mixed basis is wrong, and wrong in a direction that depends on the local apartment share. Segment `estimate_fair_price` by dwelling type, or state the basis in the result.

The guard that makes this permanent is a test, not a type — a type cannot express "these two must agree". See `src/data/cityData.test.ts`:

```ts
it('never prices a house-archetype city on apartment data', () => { ... });
```

### 1.4 `api/_lib/urlGuard.ts` — SSRF hardening for a user-supplied URL

If compass ever accepts a pasted Daft link (it should — it currently makes users type Eircode, price, m² and bedrooms by hand), it needs this. Port `urlGuard.ts` and `og.ts` wholesale; they are pure, dependency-free and have ~50 hostile fixtures.

Layered controls, in order: https only · port 443 only · reject URL userinfo (`https://daft.ie@evil.com`) · **exact-match host allowlist as the primary control** · reject punycode (a Cyrillic homoglyph arrives as `xn--dft-6cd.ie`) · resolve DNS and reject private/link-local/metadata addresses · **pin the socket to the vetted IP** · re-validate every redirect hop · streamed size cap · `text/html` only · never proxy bytes.

**Deno differences for a Supabase edge function:** `node:dns` and `node:https` are not the idiomatic path. The pure validators port unchanged. For the fetch itself, Deno's `fetch` does not expose a custom `lookup`, so socket pinning is not directly available — with a strict host allowlist the practical exposure is small, but say so in a comment rather than silently dropping the control.

**One implementation note that cost real time here:** Node calls a custom `lookup` with `{ all: true }` and expects an **array** back. Getting it wrong fails as `Invalid IP address: undefined`, which looks exactly like the remote host blocking you. The first probe of Daft, Rightmove and MyHome all returned "upstream-error" and the wrong conclusion — that portals block datacentre IPs — was one step away. `curl` returned 200 from the same hosts. **Always cross-check a blocking hypothesis with a second tool.**

### 1.5 Smaller, still worth taking

- `src/utils/units.ts` — one definition of `SQFT_PER_SQM`. It was previously declared in two files, which is how two parts of an app start disagreeing about what a square metre is.
- **Rounding discipline** — derive both m² and sq ft from the *exact* value. Rounding m² first and converting inflated a 137.5 m² result from 1,480 to 1,485 sq ft.
- `src/components/ErrorBoundary.tsx` — compass is a Lovable build and may not have one.
- Modal accessibility pattern in `CityDetailModal.tsx` — `role="dialog"`, `aria-modal`, `useId` labelling, Escape, focus trap, focus return.
- **Tooling scaffold** — ESLint 9 flat config, Vitest, and `.github/workflows/ci.yml` running lint → typecheck → test → build. Note the two silent holes worth checking for in compass too: a root `tsconfig` with `include: ["src"]` never typechecks a serverless directory, and a Vitest `include` of `src/**` never runs its tests.

---

## Part 2 — Port FROM compass TO reality-check

This direction is just as valuable and easy to overlook.

### 2.1 The Irish ingestion already exists in compass

reality-check's Stage 3 needed Irish price data and reached for CSO PxStat HPM05. Compass already has `sync-ppr`, `sync-ppr-recent`, `sync-ber`, `sync-rppi` and `trigger-syncs` edge functions, plus an `enrich_properties_from_ber()` migration that joins BER records to properties to backfill floor area, dwelling type and year built.

**That join is the thing reality-check could not build.** The Residential Property Price Register has no Eircode, no dwelling type and no floor area for second-hand sales, so there is no shared key — which is why reality-check fell back to a ratio of medians (CSO median price ÷ an *assumed* typical floor area) and stamped every resulting band `indexed` rather than `measured`.

If compass's BER join works at a usable match rate, it produces genuinely **measured** €/m² by dwelling type and routing key. Porting that back would upgrade reality-check's Irish cities from `indexed` to `measured` and remove the floor-area assumption entirely. **Check the real match rate before relying on it** — address-matching PPR to BER is fuzzy, and a 60% match with a size bias is worse than an honest assumption.

### 2.2 Eircode helpers for the zone axis

`src/lib/eircode.ts` (`extractRoutingKey`, `countyFromRoutingKey`) and the `eircode_centroids` table are exactly what reality-check's Stage 5 zone axis needs. reality-check currently ships a hand-written Dublin-district hint map in `src/utils/zones.ts`, explicitly marked as a convenience that never feeds a price band. Real centroids plus CSO HPM08 (medians by 140 routing keys) would let it feed one.

---

## Part 3 — What NOT to port

- **The Remorse Index and the Guinness metric.** They are the satire product's voice. In a valuation tool they would undermine trust.
- **The 25-city dataset.** Irrelevant to compass.
- **Country-level `CityCosts`.** reality-check models transfer tax and holding cost at *country* level, which is fine for a cross-border comparison and too coarse for Irish valuation. If compass wants TCO, model LPT bands and local authority rates properly.
- **Inline `style={{}}` objects.** reality-check uses them throughout; compass has Tailwind + shadcn/ui, which is better. Do not import the styling approach.

---

## Suggested order

1. Rotate the committed Supabase keys (§0).
2. Port `InputConfidence` and wire it through `FairPrice.tsx` (§1.1) — highest value, and everything else reads better once results carry confidence.
3. Label `comp_count` as `sampleSize` and add basis/asOf/confidence to the fair-price result (§1.2).
4. Audit `estimate_fair_price` for the mixed-basis trap (§1.3) — this is a correctness bug if it exists.
5. Add the paste-a-Daft-link flow with `urlGuard` + `og` (§1.4).
6. Report back on the PPR↔BER match rate (§2.1), which decides whether reality-check can upgrade its Irish bands.

## Evidence to demand from whoever does this

Reality-check's history is a warning about accepting summaries. An agent reported "25/25 sourced, zero unverified" for the city price data — true, and it concealed the apartment/house basis defect entirely, because the *coverage* was complete while the *metric* was inconsistent.

So: ask for the metric, not the coverage. "All comparables sourced" means nothing. "All comparables on a house basis, except these three which are apartments because the archetype is an apartment" is the claim that tells you the data is sound.
