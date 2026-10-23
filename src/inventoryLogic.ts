/**
 * Inventory logic and helper functions for House of Anna
 */

export interface InventoryInput {
  print_description: string;
  supplier: string;
  category: string;
  size: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  arrival_date: string;
  shelf_location?: string;
  photo_url?: string;
}

export interface InventoryRecord {
  product_id: string;
  print_description: string;
  supplier: string;
  category: string;
  size: string;
  cost_price: number;
  selling_price: number;
  margin: number;
  quantity_stocked: number;
  arrival_date: string;
  shelf_location: string;
  photo_url: string;
  status: 'Available' | 'Sold Out';
  created_at?: string;
}

/**
 * Parses numeric ID from string formatted like 'HOA-INV-001' or similar
 */
export function extractProductIdNumber(productId: string): number {
  if (!productId || typeof productId !== 'string') return 0;
  const match = productId.match(/HOA-INV-(\d+)/i) || productId.match(/(\d+)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Finds highest existing number from list of product IDs
 */
export function getHighestProductIdNumber(productIds: string[]): number {
  if (!productIds || productIds.length === 0) return 0;
  let max = 0;
  for (const id of productIds) {
    const num = extractProductIdNumber(id);
    if (num > max) {
      max = num;
    }
  }
  return max;
}

/**
 * Generates an array of sequential product IDs in the format HOA-INV-001
 * based on highest existing number in database.
 */
export function generateNextProductIds(existingProductIds: string[], count: number): string[] {
  const currentMax = getHighestProductIdNumber(existingProductIds);
  const result: string[] = [];
  const safeCount = Math.max(1, Math.min(count, 100)); // safe boundary

  for (let i = 1; i <= safeCount; i++) {
    const nextNum = currentMax + i;
    const formattedNum = String(nextNum).padStart(3, '0');
    result.push(`HOA-INV-${formattedNum}`);
  }

  return result;
}

/**
 * Calculates profit margin (selling price minus cost price) and percentage
 */
export function calculateMargin(sellingPrice: number, costPrice: number) {
  const selling = Number(sellingPrice) || 0;
  const cost = Number(costPrice) || 0;
  const margin = selling - cost;
  const marginPercentage = cost > 0 ? (margin / cost) * 100 : 0;
  return {
    margin,
    marginPercentage: Math.round(marginPercentage * 10) / 10,
  };
}

/**
 * Formats Kenyan Shillings with commas and KES prefix
 */
export function formatKES(amount: number): string {
  const num = Number(amount) || 0;
  return 'KES ' + num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Generates individual unit records for insertion into database
 */
export function prepareUnitRecords(
  input: InventoryInput,
  generatedIds: string[]
): InventoryRecord[] {
  const cost = Number(input.cost_price) || 0;
  const selling = Number(input.selling_price) || 0;
  const margin = selling - cost;

  return generatedIds.map((pid) => ({
    product_id: pid,
    print_description: (input.print_description || '').trim(),
    supplier: input.supplier || 'Vivian',
    category: input.category || 'Backless Dera',
    size: input.size || 'M',
    cost_price: cost,
    selling_price: selling,
    margin: margin,
    quantity_stocked: 1, // 1 unit per row
    arrival_date: input.arrival_date || new Date().toISOString().split('T')[0],
    shelf_location: (input.shelf_location || '').trim(),
    photo_url: input.photo_url || '',
    status: 'Available',
    created_at: new Date().toISOString(),
  }));
}

/**
 * Computes summary dashboard metrics for inventory
 */
export function calculateInventoryStats(records: InventoryRecord[]) {
  const totalUnits = records.length;
  const availableUnits = records.filter((r) => r.status === 'Available').length;
  const soldUnits = totalUnits - availableUnits;
  
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalPotentialMargin = 0;

  for (const r of records) {
    if (r.status === 'Available') {
      const cost = Number(r.cost_price) || 0;
      const selling = Number(r.selling_price) || 0;
      totalCostValue += cost;
      totalRetailValue += selling;
      totalPotentialMargin += (selling - cost);
    }
  }

  return {
    totalUnits,
    availableUnits,
    soldUnits,
    totalCostValue,
    totalRetailValue,
    totalPotentialMargin,
  };
}
