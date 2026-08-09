export type RegionCategory = 'All' | 'Ireland' | 'UK & Europe' | 'North America' | 'Middle East' | 'Australia';
export type LaneFilter = 'all' | 'lane1' | 'lane2';

export interface IrishPropertyInput {
  url?: string;
  title: string;
  priceEur: number;
  beds: number;
  baths: number;
  sqft: number;
  location: string;
  propertyType: string;
  berRating: string;
  features: string[];
}

export interface CityData {
  id: string;
  name: string;
  country: string;
  flagEmoji: string;
  region: 'Ireland' | 'UK & Europe' | 'North America' | 'Middle East' | 'Australia';
  lane: 1 | 2;
  currency: 'EUR' | 'GBP' | 'USD' | 'AUD' | 'CAD' | 'AED';
  currencySymbol: string;
  exchangeRateFromEur: number; // 1 EUR in target currency
  pricePerSqM: number; // Average price in EUR per m2
  typicalBuilding: string;
  sunnyDaysPerYear: number;
  averageSummerTempC: number;
  samplePerks: string[];
  imageUrl: string;
  portalName: string;
  sarcasticQuote: string;
  searchKeywords: string;
  portalSearchUrl: string;
}

export interface ComparisonResult {
  city: CityData;
  convertedPrice: number;
  estimatedSqM: number;
  estimatedSqFt: number;
  estimatedBeds: number;
  estimatedBaths: number;
  spaceMultiplier: number;
  remorseIndex: number; // 0 to 100
  remorseLabel: string;
  sunnyDaysDiff: number;
  guinnessEquivPints: number;
  highlightedPerk: string;
  googleSearchUrl: string;
  portalSearchUrl: string;
}

export interface PresetProperty {
  id: string;
  label: string;
  description: string;
  input: IrishPropertyInput;
}
