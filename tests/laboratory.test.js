const { Laboratory } = require('../src/Laboratory');

describe('Laboratory initialization', () => {
  test('starts with zero quantity for each known substance', () => {
    const lab = new Laboratory(['stardust', 'moonwater']);
    expect(lab.getQuantity('stardust')).toBe(0);
    expect(lab.getQuantity('moonwater')).toBe(0);
  });

  test('can be initialized with existing decimal stock', () => {
    const lab = new Laboratory(['stardust', 'moonwater'], {
      stardust: 1.25,
    });

    expect(lab.getQuantity('stardust')).toBe(1.25);
    expect(lab.getQuantity('moonwater')).toBe(0);
  });

  describe('error handling', () => {
    test('rejects empty lists of known substances', () => {
      expect(() => new Laboratory([])).toThrow(RangeError);
    });

    test('rejects invalid substance names', () => {
      expect(() => new Laboratory(['', 3])).toThrow(TypeError);
    });

    test('rejects duplicate substance names', () => {
      expect(() => new Laboratory(['stardust', 'Stardust'])).toThrow(
        RangeError,
      );
    });

    test('rejects unknown entries in the initial stock', () => {
      expect(() =>
        new Laboratory(['stardust'], { moonwater: 1 }),
      ).toThrow(ReferenceError);
    });

    test('rejects negative initial stock quantities', () => {
      expect(() =>
        new Laboratory(['stardust'], { stardust: -1 }),
      ).toThrow(RangeError);
    });
  });
});

describe('Laboratory stock management', () => {
  test('add increases inventory for known substances', () => {
    const lab = new Laboratory(['stardust']);
    lab.add('stardust', 0.5);
    lab.add('stardust', 1.25);

    expect(lab.getQuantity('stardust')).toBe(1.75);
  });
});
