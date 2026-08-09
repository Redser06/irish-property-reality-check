import { CityData, ComparisonResult, IrishPropertyInput } from '../types';

/**
 * Parses user input or URL strings to extract property details.
 */
export function parseIrishPropertyInput(rawInput: string, fallbackInput: IrishPropertyInput): IrishPropertyInput {
  const cleanStr = rawInput.trim();
  if (!cleanStr) return fallbackInput;

  // Check if string contains numbers that look like price (e.g., 550k, 600000, €650,000)
  let extractedPrice = fallbackInput.priceEur;
  const priceMatch = cleanStr.match(/€?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:k|K|000)?/);
  if (priceMatch) {
    let rawNumStr = priceMatch[1].replace(/,/g, '');
    let num = parseInt(rawNumStr, 10);
    if (cleanStr.toLowerCase().includes('k') && num < 10000) {
      num *= 1000;
    }
    if (num > 50000 && num < 20000000) {
      extractedPrice = num;
    }
  }

  // Check for bed numbers
  let extractedBeds = fallbackInput.beds;
  const bedMatch = cleanStr.match(/(\d+)\s*(?:bed|bedroom|br)/i);
  if (bedMatch) {
    const beds = parseInt(bedMatch[1], 10);
    if (beds >= 1 && beds <= 15) {
      extractedBeds = beds;
    }
  }

  return {
    ...fallbackInput,
    priceEur: extractedPrice,
    beds: extractedBeds,
    url: cleanStr.startsWith('http') ? cleanStr : undefined,
    title: cleanStr.startsWith('http') 
      ? `Property from ${new URL(cleanStr).hostname}`
      : (cleanStr.length > 5 ? cleanStr : fallbackInput.title)
  };
}

/**
 * Calculates comparison analytics for a given city and Irish property input.
 */
export function calculateComparison(input: IrishPropertyInput, city: CityData): ComparisonResult {
  const convertedPrice = Math.round(input.priceEur * city.exchangeRateFromEur);
  
  // Calculate space in m2 based on local average pricePerSqM
  const estimatedSqM = Math.round(input.priceEur / city.pricePerSqM);
  const estimatedSqFt = Math.round(estimatedSqM * 10.7639);
  
  // Calculate estimated rooms based on sqFt
  const estimatedBeds = Math.max(1, Math.round(estimatedSqFt / 350));
  const estimatedBaths = Math.max(1, Math.round(estimatedBeds * 0.8));

  // Space multiplier compared to user's Irish property
  const inputSqFt = input.sqft || 900;
  const spaceMultiplier = parseFloat((estimatedSqFt / inputSqFt).toFixed(1));

  // Sunny days difference (Dublin average = 140 days)
  const sunnyDaysDiff = city.sunnyDaysPerYear - 140;

  // Remorse Index Calculation (0 to 100)
  // Higher space multiplier & more sunny days & cheaper m2 = Higher Remorse!
  let remorseScore = 30; // base score
  
  if (spaceMultiplier > 1.0) {
    remorseScore += Math.min(45, (spaceMultiplier - 1.0) * 20);
  } else {
    remorseScore -= Math.min(25, (1.0 - spaceMultiplier) * 30);
  }

  if (sunnyDaysDiff > 0) {
    remorseScore += Math.min(30, (sunnyDaysDiff / 200) * 30);
  }

  // Cap remorse index between 5 and 99
  const remorseIndex = Math.max(5, Math.min(99, Math.round(remorseScore)));

  // Remorse Label
  let remorseLabel = 'Mild Curiosity';
  if (remorseIndex >= 85) {
    remorseLabel = 'Existential Breakdown & Immediate Relocation';
  } else if (remorseIndex >= 70) {
    remorseLabel = 'Severe Buyer\'s Remorse';
  } else if (remorseIndex >= 50) {
    remorseLabel = 'Heavy Envy & Crying in Barry\'s Tea';
  } else if (remorseIndex >= 30) {
    remorseLabel = 'Slight Smugness / Tolerable Trade-Off';
  } else {
    remorseLabel = 'At Least You Have Dublin/Irish Craic!';
  }

  // Guinness Equiv Pints (Pint price approx €6.50)
  // Value difference represented in Guinness pints per year
  const guinnessEquivPints = Math.round((estimatedSqFt - inputSqFt) * 15);

  // Perk highlight based on space & sun
  let highlightedPerk = city.samplePerks[0];
  if (spaceMultiplier >= 2.0) {
    highlightedPerk = `${spaceMultiplier}x larger living space with private grounds`;
  } else if (sunnyDaysDiff >= 100) {
    highlightedPerk = `${city.sunnyDaysPerYear} sunny days a year vs Irish rain`;
  }

  // Google search URL pre-formatted
  const googleSearchQuery = `${estimatedBeds} bedroom house for sale ${city.name} ${city.currencySymbol}${convertedPrice.toLocaleString()}`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery)}`;

  // Portal search URL
  const portalQuery = `${city.portalSearchUrl}`;

  return {
    city,
    convertedPrice,
    estimatedSqM,
    estimatedSqFt,
    estimatedBeds,
    estimatedBaths,
    spaceMultiplier,
    remorseIndex,
    remorseLabel,
    sunnyDaysDiff,
    guinnessEquivPints,
    highlightedPerk,
    googleSearchUrl,
    portalSearchUrl: portalQuery
  };
}
