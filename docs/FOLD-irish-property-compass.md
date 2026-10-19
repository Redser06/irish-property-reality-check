# Fold: irish-property-compass → irish-property-reality-check

## Source

| | |
| :--- | :--- |
| Requested repo | https://github.com/Redser06/irish-property-compass |
| Commit recorded | `bccd75ae281e08b398074f00014215cd9f15ed7c` |
| Where that SHA was read | Lovable project **Irish Property Compass**, id `ca7e9d3c-0965-4fd8-a79c-b9ee96582ed6`, `latest_commit_sha` on 2026-10-19. Last edited 2026-04-18. |

`git clone` and the GitHub API (anonymous, and with this run's installation token) both returned **404** for `Redser06/irish-property-compass`. It is not in the public repo list for `Redser06`. The Lovable project of the same name is the only copy that could be read. It was not modified. No `.env` file was opened.

## What the two apps are

**Keeper** (`irish-property-reality-check`): a client-only React 18 + Vite 6 + TypeScript app. Vanilla CSS, glass panels. You enter an Irish asking price and floor area; it shows what that budget buys in 25 cities, plus a satirical remorse index. City €/m² figures carry a source and a date. CI already runs lint, typecheck, test, and build.

**Compass** (Lovable, Vite + React + Tailwind + shadcn): an authenticated Irish sales dashboard. Supabase holds profiles, cached Property Price Register rows, BER records, the CSO RPPI, and an RTB rent index. Screens: Dashboard, Sales Feed + map, Fair Price Check, My Comps, Property Detail, Alerts, Settings, Auth. The fair-price grade is a Postgres function over recent sales, with a flat €/m² fallback when fewer than five comps exist.

## Ported

Adapted to the keeper's stack. No new runtime dependencies.

| Compass | Keeper | What survived |
| :--- | :--- | :--- |
| `src/lib/eircode.ts` | `src/utils/eircode.ts` | Eircode regexes, `normalizeEircode`, `extractRoutingKey`, `extractCountyFromAddress`, `countyFromRoutingKey`, the 26-county list. `findEircode` is a thin wrapper so a code can be pulled out of a longer note. |
| `src/pages/FairPrice.tsx` verdict cut-points (`-8 / 5 / 15`) and the refusal of prices under €50,000 or floor areas under 30 m² | `src/utils/fairPrice.ts`, `src/components/FairPriceCheck.tsx` | Same labels (Underpriced, Fair Price, Above Market, Overpriced) and the same copy, pointed at a benchmark instead of a sale median. |
| `supabase/migrations/20260418194930_…sql` `estimate_fair_price` | `estimateFairBand` in `src/utils/fairPrice.ts` | `ROUND(ppsm × integer m² × 0.92 / 1.00 / 1.08)`. `percentile_cont(0.5)` is ported as `percentileCont50` for a sale list, and is tested. It is not what the on-screen grade uses, because this app has no sale cache. |
| `src/hooks/useProperties.ts` `useMarketStats` | `summariseSales` in `src/utils/fairPrice.ts` | Mean price, upper-middle median, mean €/m². Floor area of 30 m² or less is excluded from the €/m² mean. |
| `src/data/mockData.ts` `formatPrice`, `formatPriceDiff` | `formatEuro`, `askingVsSalePercent` | `en-IE` euro formatting. Asking-vs-sale percent is the helper only; the panel shows asking-vs-benchmark, which is the check Compass actually rendered. |
| `supabase/functions/sync-ppr/index.ts` positional CSV read | `src/utils/pprRow.ts` | Date (`D M Y` or `D/M/Y`), price, address, county, Eircode, and the routing-key rule (first three Eircode characters, so `D6W` stays intact). |
| Fair Price screen | `src/components/FairPriceCheck.tsx`, mounted from `src/App.tsx` | One glass panel under the existing input. Same visual language as the rest of the keeper. |
| Place detection wired into the existing parser | `parseIrishPropertyInput` in `src/utils/comparatorEngine.ts` | A pasted county or Eircode updates `location`. "Dublin" does not overwrite a more specific fallback such as "Dublin 12". `ParseResult.extracted.place` tells the input notice. |
| Which €/m² the panel may use | `src/data/irishBenchmarks.ts` | Dublin baseline, plus Cork, Galway, Limerick, and (by city name) Belfast, from data this repo already cites. |

Tests: `src/utils/eircode.test.ts`, `src/utils/fairPrice.test.ts`, `src/utils/pprRow.test.ts`, `src/data/irishBenchmarks.test.ts`, plus two parser cases in `src/utils/comparatorEngine.test.ts`.

## Skipped, and why

| Skipped | Why |
| :--- | :--- |
| `.env` | Secrets. Not opened. |
| `bun.lock`, `bun.lockb`, `package-lock.json` | Lockfile churn. The keeper already has its own lockfile. No dependency was added. |
| `src/components/ui/**` (shadcn), Tailwind, `components.json`, PostCSS | A second design system. The panel uses the existing glass CSS. |
| `src/integrations/supabase/client.ts` and `types.ts` | Not ported. The client file is where a project URL and anon key would live. |
| `src/context/AuthContext.tsx`, `ProfileContext.tsx`, `src/pages/Auth.tsx`, `Settings.tsx` | Supabase auth and a per-user home profile. The keeper has no accounts. The input form is already the home profile. |
| `src/pages/Index.tsx`, `Feed.tsx`, `Comps.tsx`, `PropertyDetail.tsx`, `Alerts.tsx`, `NotFound.tsx` | Dashboard, map feed, comps table, and alerts all read Supabase. Comps also charts `priceTrendData` / `priceByTypeData`, which are eight invented sales dated 2026, not the Price Register. |
| `src/data/mockData.ts` sale rows, trend series, asking-vs-sale scatter | Invented addresses and prices. Bringing them over would look like sold-price evidence. |
| `src/components/MapView.tsx`, Leaflet | Needs coordinates this app does not have. |
| `src/hooks/useProperties.ts` query hooks | Supabase client calls. The pure stats were ported; the queries were not. |
| `find_nearby_sales` (haversine RPC) | No lat/lng in the keeper. |
| `enrich_properties_from_ber` and the bedroom-from-floor-area `CASE` | Joins two tables this app does not have. `estimate_fair_price` accepts `p_bedrooms` and never reads it, so the grade does not pretend to adjust for beds. |
| `supabase/functions/sync-ber`, `sync-rppi`, `sync-ppr-recent`, `trigger-syncs` | Deno edge functions with a service-role key. BER sync's no-CSV path inserts hand-written "representative" certificates. That seed was not copied. |
| `supabase/migrations/**`, `supabase/config.toml`, `supabase/.temp/**` | Schema for a backend this app does not run. `.temp` is CLI scratch. |
| `src/components/AppLayout.tsx`, `AppSidebar.tsx`, `NavLink.tsx` | Sidebar chrome for a multi-route app. The keeper is one page. |
| `src/test/example.test.ts`, `src/test/setup.ts` | Boilerplate. |
| `src/App.css`, Compass `index.css`, `README.md`, `SESSION_SUMMARY.md`, `.lovable/plan.md` | Lovable template and a March 2026 session note. The product description in the plan was used to inventory screens, not copied. |
| Stamp duty, Help to Buy, local property tax | **Not in Compass.** Nothing was invented. The panel says so. |
| Compass fallback €/m²: Dublin 5,500, Wicklow 4,500, else 3,500 | Unsourced literals in `estimate_fair_price`. Kept as `COMPASS_UNSOURCED_FALLBACK_PPSM` and refused by `resolveIrishPlace`. Wicklow (and every other county without a keeper figure) renders an explanation instead of a grade. |

## Judgement calls

1. **The on-screen grade uses this repo's €/m² figures, not a PPR median.** Compass's real estimator is `percentile_cont` over 24 months of sales in the routing key, then the county, and only then the flat fallback. There is no sale table here. Substituting the Dublin baseline (€6,400/m², Numbeo apartments, as of 2026-08-07, cross-checked to Daft Q1 2026 and the CSO RPPI) and the Lane 1 city figures is the honest stand-in. The panel states the basis and the date, and that apartment €/m² makes a house look cheap. Cork, Galway, Limerick, and Belfast are marked editorial when their own source string says so.

2. **`countyFromRoutingKey` was not "fixed".** It is partial (`H91` → null) and wrong for several keys versus the [Wikipedia list of Eircode routing areas](https://en.wikipedia.org/wiki/List_of_Eircode_routing_areas_in_Ireland), checked 2026-10-19. Examples: `Y25` Gorey is Co. Wexford, Compass says Wicklow; `A86` Dunboyne is Co. Meath, Compass says Dublin; `A92` Drogheda is Co. Louth (the same key also covers Laytown in Co. Meath), Compass says Dublin. Those keys are in `ROUTING_KEY_COUNTY_MISMATCHES`. A county written in the address wins. If the only clue is the routing key, the grade follows Compass and the mismatch stays on screen. Routing keys are postal areas and can cross counties ([eircode.ie](https://www.eircode.ie/what-is-eircode)).

3. **The PPR row parser does not keep the Dublin/Wicklow-only filter.** That was the edge function's sync scope, not a property of the register. The yearly Smart Dublin mirror URLs were not copied; they are download endpoints, not logic, and several years in that file shared one resource id.

4. **County matching is a substring search**, as Compass wrote it (`"cork"` inside the address). That can false-hit. It was not replaced with a stricter tokeniser.

5. **No CI was added.** `.github/workflows/ci.yml` already runs lint, `tsc --noEmit`, `vitest run`, and `build` on pull requests to `main`.
