import { describe, expect, it } from 'vitest';
import { parsePprRow } from './pprRow';

describe('parsePprRow', () => {
  it('reads a positional PPR line, including an unpadded day and a euro price', () => {
    const row = parsePprRow([
      '1 02 2024',
      '14 Oakfield Road, Ranelagh',
      'Dublin',
      'D06 Y2K3',
      '€625,000.00',
      'No',
      'No',
      'Second-Hand Dwelling house /Apartment',
      '',
    ]);
    expect(row).toMatchObject({
      dateOfSale: '2024-02-01',
      county: 'Dublin',
      price: 625000,
      routingKey: 'D06',
      eircode: 'D06 Y2K3',
    });
  });

  it('takes D6W from the first three Eircode characters and accepts a slashed date', () => {
    const row = parsePprRow([
      '15/03/2023',
      'Somewhere',
      'Dublin',
      'D6W AB12',
      '450000',
    ]);
    expect(row?.dateOfSale).toBe('2023-03-15');
    expect(row?.routingKey).toBe('D6W');
  });

  it('rejects a short row and a non-positive price', () => {
    expect(parsePprRow(['01/01/2024', 'addr', 'Cork'])).toBeNull();
    expect(parsePprRow(['01/01/2024', 'addr', 'Cork', '', '€0'])).toBeNull();
  });

  it('does not drop counties outside Dublin and Wicklow', () => {
    const row = parsePprRow(['8/2/2022', 'Hillcrest', 'Cork', 'P31 K8W2', '340000']);
    expect(row?.county).toBe('Cork');
    expect(row?.routingKey).toBe('P31');
  });
});
