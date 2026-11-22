import type { Tier, TierTemplateId } from '../types';
import { DEFAULT_TIERS } from './constants';

export interface TierTemplate {
  id: TierTemplateId;
  label: string;
  description: string;
  tiers: Tier[];
}

const SABCD_TIERS: Tier[] = [
  { id: 'S', name: 'S', color: '#FF7F7F', starRating: 5 },
  { id: 'A', name: 'A', color: '#FFBF7F', starRating: 4 },
  { id: 'B', name: 'B', color: '#FFDF7F', starRating: 3 },
  { id: 'C', name: 'C', color: '#BFFF7F', starRating: 2 },
  { id: 'D', name: 'D', color: '#7FBFFF', starRating: 1 },
];

const NUMERIC_TIERS: Tier[] = [
  { id: 'num-5', name: '5', color: '#CC0000', starRating: 5 },
  { id: 'num-4', name: '4', color: '#FF6A00', starRating: 4 },
  { id: 'num-3', name: '3', color: '#FFCC00', starRating: 3 },
  { id: 'num-2', name: '2', color: '#40C020', starRating: 2 },
  { id: 'num-1', name: '1', color: '#0098FF', starRating: 1 },
];

export const TIER_TEMPLATES: Record<TierTemplateId, TierTemplate> = {
  stars: {
    id: 'stars',
    label: 'Stars',
    description: '5.0 to 0.5 stars, matches Letterboxd ratings',
    tiers: DEFAULT_TIERS,
  },
  sabcd: {
    id: 'sabcd',
    label: 'S / A / B / C / D',
    description: 'Classic tier ranking',
    tiers: SABCD_TIERS,
  },
  numeric: {
    id: 'numeric',
    label: '1 – 5',
    description: 'Simple numeric ranking',
    tiers: NUMERIC_TIERS,
  },
};

export const TIER_TEMPLATE_ORDER: TierTemplateId[] = ['stars', 'sabcd', 'numeric'];

export function createTiers(templateId: TierTemplateId): Tier[] {
  const template = TIER_TEMPLATES[templateId] ?? TIER_TEMPLATES.stars;
  return template.tiers.map((tier) => ({ ...tier }));
}
