import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractProductIdNumber,
  getHighestProductIdNumber,
  generateNextProductIds,
  calculateMargin,
  formatKES,
  prepareUnitRecords,
  calculateInventoryStats,
  type InventoryInput,
} from './inventoryLogic';

test('extractProductIdNumber correctly extracts numeric suffix', () => {
  assert.equal(extractProductIdNumber('HOA-INV-001'), 1);
  assert.equal(extractProductIdNumber('HOA-INV-042'), 42);
  assert.equal(extractProductIdNumber('HOA-INV-999'), 999);
  assert.equal(extractProductIdNumber('hoa-inv-007'), 7);
  assert.equal(extractProductIdNumber('INV-123'), 123);
  assert.equal(extractProductIdNumber('invalid'), 0);
  assert.equal(extractProductIdNumber(''), 0);
});

test('getHighestProductIdNumber finds maximum integer from diverse list', () => {
  const ids = ['HOA-INV-001', 'HOA-INV-015', 'HOA-INV-008', 'HOA-INV-042', 'HOA-INV-003'];
  assert.equal(getHighestProductIdNumber(ids), 42);
  assert.equal(getHighestProductIdNumber([]), 0);
  assert.equal(getHighestProductIdNumber(['HOA-INV-005']), 5);
});

test('generateNextProductIds generates sequential IDs from highest existing number', () => {
  // Empty database starts at HOA-INV-001
  const firstBatch = generateNextProductIds([], 3);
  assert.deepEqual(firstBatch, ['HOA-INV-001', 'HOA-INV-002', 'HOA-INV-003']);

  // Next batch with highest = 3
  const secondBatch = generateNextProductIds(['HOA-INV-001', 'HOA-INV-002', 'HOA-INV-003'], 2);
  assert.deepEqual(secondBatch, ['HOA-INV-004', 'HOA-INV-005']);

  // Suffix pads correctly beyond single/double digits
  const higherBatch = generateNextProductIds(['HOA-INV-099'], 2);
  assert.deepEqual(higherBatch, ['HOA-INV-100', 'HOA-INV-101']);
});

test('calculateMargin calculates profit margin and percentage', () => {
  const result = calculateMargin(2500, 1500);
  assert.equal(result.margin, 1000);
  assert.equal(result.marginPercentage, 66.7);

  const breakeven = calculateMargin(1000, 1000);
  assert.equal(breakeven.margin, 0);
  assert.equal(breakeven.marginPercentage, 0);

  const loss = calculateMargin(800, 1000);
  assert.equal(loss.margin, -200);
  assert.equal(loss.marginPercentage, -20);
});

test('formatKES formats amounts properly with currency symbol', () => {
  assert.equal(formatKES(2500), 'KES 2,500');
  assert.equal(formatKES(0), 'KES 0');
  assert.equal(formatKES(125000), 'KES 125,000');
});

test('prepareUnitRecords creates 1 record per unit with identical details and unique IDs', () => {
  const input: InventoryInput = {
    print_description: 'Floral Ankara Dera in Sunset Orange',
    supplier: 'Vivian',
    category: 'Backless Dera',
    size: 'M',
    cost_price: 1500,
    selling_price: 3200,
    quantity: 3,
    arrival_date: '2026-10-22',
    shelf_location: 'Shelf B2',
    photo_url: 'https://example.com/photo.jpg',
  };

  const generatedIds = ['HOA-INV-001', 'HOA-INV-002', 'HOA-INV-003'];
  const records = prepareUnitRecords(input, generatedIds);

  assert.equal(records.length, 3);
  assert.equal(records[0].product_id, 'HOA-INV-001');
  assert.equal(records[1].product_id, 'HOA-INV-002');
  assert.equal(records[2].product_id, 'HOA-INV-003');

  records.forEach((rec) => {
    assert.equal(rec.print_description, 'Floral Ankara Dera in Sunset Orange');
    assert.equal(rec.supplier, 'Vivian');
    assert.equal(rec.category, 'Backless Dera');
    assert.equal(rec.size, 'M');
    assert.equal(rec.cost_price, 1500);
    assert.equal(rec.selling_price, 3200);
    assert.equal(rec.margin, 1700);
    assert.equal(rec.quantity_stocked, 1);
    assert.equal(rec.arrival_date, '2026-10-22');
    assert.equal(rec.shelf_location, 'Shelf B2');
    assert.equal(rec.photo_url, 'https://example.com/photo.jpg');
    assert.equal(rec.status, 'Available');
  });
});

test('calculateInventoryStats correctly tallies units, costs, retail value and margin', () => {
  const sampleRecords = [
    {
      product_id: 'HOA-INV-001',
      print_description: 'Print 1',
      supplier: 'Vivian',
      category: 'Backless Dera',
      size: 'M',
      cost_price: 1000,
      selling_price: 2500,
      margin: 1500,
      quantity_stocked: 1,
      arrival_date: '2026-10-22',
      shelf_location: 'A1',
      photo_url: '',
      status: 'Available' as const,
    },
    {
      product_id: 'HOA-INV-002',
      print_description: 'Print 1',
      supplier: 'Vivian',
      category: 'Backless Dera',
      size: 'M',
      cost_price: 1000,
      selling_price: 2500,
      margin: 1500,
      quantity_stocked: 1,
      arrival_date: '2026-10-22',
      shelf_location: 'A1',
      photo_url: '',
      status: 'Sold Out' as const,
    },
    {
      product_id: 'HOA-INV-003',
      print_description: 'Print 2',
      supplier: 'Chelsea',
      category: 'Amara Wrap Pants',
      size: 'L',
      cost_price: 1200,
      selling_price: 2800,
      margin: 1600,
      quantity_stocked: 1,
      arrival_date: '2026-10-22',
      shelf_location: 'B1',
      photo_url: '',
      status: 'Available' as const,
    },
  ];

  const stats = calculateInventoryStats(sampleRecords);
  assert.equal(stats.totalUnits, 3);
  assert.equal(stats.availableUnits, 2);
  assert.equal(stats.soldUnits, 1);
  // Available units: HOA-001 (cost 1000, selling 2500) + HOA-003 (cost 1200, selling 2800)
  assert.equal(stats.totalCostValue, 2200);
  assert.equal(stats.totalRetailValue, 5300);
  assert.equal(stats.totalPotentialMargin, 3100);
});
