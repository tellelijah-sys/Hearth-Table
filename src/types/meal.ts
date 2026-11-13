export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export type CuisineRegion =
  | 'West African'
  | 'East Asian'
  | 'South Asian'
  | 'Mediterranean'
  | 'Latin American'
  | 'Middle Eastern'
  | 'Caribbean'
  | 'European'
  | 'North American'
  | 'Southeast Asian';

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'pescatarian';

export type NutritionGoal =
  | 'high-protein'
  | 'balanced'
  | 'low-carb'
  | 'heart-healthy'
  | 'high-fiber'
  | 'calorie-conscious'
  | 'kid-friendly';

export type EquipmentType =
  | 'stovetop'
  | 'one-pot'
  | 'oven'
  | 'air-fryer'
  | 'slow-cooker'
  | 'no-cook'
  | 'blender';

export type BudgetTier = 'thrifty' | 'moderate' | 'special';

export type PalateStyle = 'familiar' | 'balanced' | 'adventurous';

export type RotationFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'occasional'
  | 'paused';

export type GroceryAisle =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Grains & Bakery'
  | 'Canned & Dry Goods'
  | 'Spices & Oils'
  | 'Frozen & Other';

export interface IngredientItem {
  name: string;
  quantity: number;
  unit: string;
  aisle: GroceryAisle;
  substitutes?: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: CuisineRegion;
  mealTypes: MealSlot[];
  prepMinutes: number;
  cookMinutes: number;
  defaultServings: number;
  budgetTier: BudgetTier;
  equipment: EquipmentType[];
  dietaryTags: DietaryTag[];
  nutritionGoals: NutritionGoal[];
  palate: PalateStyle;
  kidFriendly: boolean;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  ingredients: IngredientItem[];
  instructions: string[];
  regionalNotes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  sources?: GroundingSource[];
  isCustomOrImported?: boolean;
}

export interface MealPreferenceRecord {
  liked: boolean;
  frequency: RotationFrequency;
  lastPlannedWeek?: string;
}

export interface PantryItem {
  id: string;
  name: string;
  aisle: GroceryAisle;
  quantityNote?: string;
  useSoon?: boolean;
  addedAt: number;
}

export type WeeklyPlan = Record<DayOfWeek, Record<MealSlot, string | null>>;

export interface CustomGroceryItem {
  id: string;
  name: string;
  quantityText: string;
  aisle: GroceryAisle;
  checked: boolean;
}

export interface AggregatedGroceryItem {
  key: string;
  name: string;
  totalQuantity: number;
  unit: string;
  aisle: GroceryAisle;
  inPantry: boolean;
  pantryUseSoon: boolean;
  checked: boolean;
  fromRecipes: string[];
  substitutes: string[];
}

export interface TravelRegion {
  id: string;
  name: string;
  subtitle: string;
  currencySymbol: string;
  localStaples: string[];
  substitutionTips: Record<string, string>;
}

export interface UserPreferences {
  householdSize: number;
  dietaryRestrictions: DietaryTag[];
  nutritionGoals: NutritionGoal[];
  equipment: EquipmentType[];
  budgetTier: BudgetTier;
  palate: PalateStyle;
  excludedIngredients: string[];
  preferredCuisines: CuisineRegion[];
  activeSlots: MealSlot[];
  regionId: string;
  theme: 'light' | 'dark';
}
