import type { TravelRegion } from '../types/meal';

export const TRAVEL_REGIONS: TravelRegion[] = [
  {
    id: 'global-home',
    name: 'Standard Supermarket',
    subtitle: 'Broad everyday grocery availability across major urban markets',
    currencySymbol: '$',
    localStaples: ['chicken', 'rice', 'tomatoes', 'onions', 'garlic', 'eggs', 'oats', 'lentils'],
    substitutionTips: {},
  },
  {
    id: 'west-africa',
    name: 'West Africa (Nigeria / Ghana)',
    subtitle: 'Local open-market produce, plantains, yams, red palm & groundnut staples',
    currencySymbol: '₦',
    localStaples: ['rice', 'plantains', 'tomatoes', 'bell peppers', 'scotch bonnet', 'groundnut', 'beans', 'ginger', 'chicken'],
    substitutionTips: {
      'kale': 'ugu (fluted pumpkin leaves) or spinach',
      'baby bok choy': 'fresh green amaranth (efo/aleefu) or cabbage',
      'chickpeas': 'black-eyed peas or honey beans',
      'tortillas': 'warm flatbread or roasted yam slices',
      'couscous': 'gari, acheke, or broken rice',
      'sour cream': 'plain unsweetened yogurt',
    },
  },
  {
    id: 'east-asia',
    name: 'East Asia (Japan / Korea / Taiwan)',
    subtitle: 'Rice, tofu, scallions, miso, bok choy, noodles & fresh seafood markets',
    currencySymbol: '¥',
    localStaples: ['tofu', 'eggs', 'rice', 'noodles', 'bok choy', 'soy sauce', 'sesame oil', 'ginger', 'scallions'],
    substitutionTips: {
      'plantains': 'sweet potato or kabocha squash',
      'couscous': 'steamed short-grain rice or millet',
      'black beans': 'azuki beans or edamame',
      'oregano': 'thyme or shiso',
      'cheddar cheese': 'soft silken tofu drizzle or mild mozzarella',
    },
  },
  {
    id: 'south-asia',
    name: 'South Asia (India / Pakistan / Sri Lanka)',
    subtitle: 'Lentils, chickpeas, basmati, yogurt, turmeric, cumin & fresh coriander',
    currencySymbol: '₹',
    localStaples: ['red lentils', 'chickpeas', 'basmati rice', 'onions', 'tomatoes', 'ginger', 'garlic', 'yogurt', 'spinach'],
    substitutionTips: {
      'black beans': 'rajma (kidney beans) or kala chana',
      'tortillas': 'roti or chapati',
      'pasta': 'vermicelli (seviyan) or basmati rice',
      'beef': 'mutton, chicken thighs, or paneer',
      'peanut butter': 'roasted cashew or groundnut paste',
    },
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean & Southern Europe',
    subtitle: 'Olive oil, lemons, chickpeas, tomatoes, crusty bread, herbs & seafood',
    currencySymbol: '€',
    localStaples: ['olive oil', 'lemon', 'chickpeas', 'tomatoes', 'garlic', 'couscous', 'pasta', 'eggs', 'spinach'],
    substitutionTips: {
      'plantains': 'roasted sweet potato or potatoes',
      'scotch bonnet': 'red chili flakes or Calabrian chili',
      'soy sauce': 'tamari or balsamic + sea salt',
      'bok choy': 'chard, fennel greens, or spinach',
    },
  },
  {
    id: 'latin-america',
    name: 'Latin America & Caribbean',
    subtitle: 'Beans, corn, rice, plantains, lime, cilantro, avocados & peppers',
    currencySymbol: '$',
    localStaples: ['black beans', 'rice', 'plantains', 'corn tortillas', 'lime', 'tomatoes', 'avocado', 'chicken'],
    substitutionTips: {
      'couscous': 'quinoa or white rice',
      'miso paste': 'vegetable bouillon + splash of soy sauce',
      'bok choy': 'cabbage or collard greens',
      'tahini': 'pumpkin seed butter or avocado crema',
    },
  },
  {
    id: 'middle-east',
    name: 'Middle East & North Africa',
    subtitle: 'Lentils, chickpeas, flatbread, tahini, yogurt, cumin & fresh mint',
    currencySymbol: 'د.إ',
    localStaples: ['lentils', 'chickpeas', 'rice', 'tomatoes', 'onions', 'eggs', 'yogurt', 'olive oil', 'lemon'],
    substitutionTips: {
      'bacon': 'smoked turkey strips or spiced roasted chickpeas',
      'soy sauce': 'pomegranate molasses + sea salt',
      'tortillas': 'khubz, pita, or lavash',
      'peanut butter': 'tahini',
    },
  },
];

export function getRegionById(id: string): TravelRegion {
  return TRAVEL_REGIONS.find((r) => r.id === id) ?? TRAVEL_REGIONS[0];
}
