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

describe('Laboratory reactions', () => {
  test('registers products defined by reactions', () => {
    const lab = new Laboratory(
      ['stardust', 'moonwater'],
      {},
      {
        elixir: [
          [1.5, 'stardust'],
          [0.25, 'moonwater'],
        ],
      },
    );

    expect(lab.getQuantity('elixir')).toBe(0);
  });

  test('allows initial stock for products', () => {
    const lab = new Laboratory(
      ['stardust'],
      { elixir: 2 },
      {
        elixir: [[1, 'stardust']],
      },
    );

    expect(lab.getQuantity('elixir')).toBe(2);
  });

  describe('error handling', () => {
    test('rejects invalid reaction dictionaries', () => {
      expect(() => new Laboratory(['stardust'], {}, null)).toThrow(TypeError);
      expect(() => new Laboratory(['stardust'], {}, [])).toThrow(TypeError);
    });

    test('rejects duplicate product names', () => {
      expect(() =>
        new Laboratory(
          ['stardust'],
          {},
          {
            stardust: [[1, 'stardust']],
          },
        ),
      ).toThrow(RangeError);
    });

    test('rejects reactions referencing unknown substances', () => {
      expect(() =>
        new Laboratory(
          ['stardust'],
          {},
          {
            elixir: [[1, 'moonwater']],
          },
        ),
      ).toThrow(ReferenceError);
    });

    test('rejects invalid reagent definitions', () => {
      expect(() =>
        new Laboratory(
          ['stardust'],
          {},
          {
            elixir: [['not-a-number', 'stardust']],
          },
        ),
      ).toThrow(TypeError);
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

  test('add returns the updated quantity', () => {
    const lab = new Laboratory(['stardust']);
    expect(lab.add('stardust', 0.5)).toBe(0.5);
    expect(lab.add('stardust', 0.25)).toBe(0.75);
  });

  test('can add product stock directly', () => {
    const lab = new Laboratory(
      ['stardust'],
      {},
      {
        elixir: [[1, 'stardust']],
      },
    );

    expect(lab.add('elixir', 1.25)).toBe(1.25);
    expect(lab.getQuantity('elixir')).toBe(1.25);
  });

  describe('error handling', () => {
    test('rejects unknown substances', () => {
      const lab = new Laboratory(['stardust']);
      expect(() => lab.add('moonwater', 1)).toThrow(ReferenceError);
      expect(() => lab.getQuantity('moonwater')).toThrow(ReferenceError);
    });

    test('rejects invalid substance names', () => {
      const lab = new Laboratory(['stardust']);
      expect(() => lab.add('', 1)).toThrow(TypeError);
      expect(() => lab.getQuantity('')).toThrow(TypeError);
    });

    test('rejects invalid quantities', () => {
      const lab = new Laboratory(['stardust']);
      expect(() => lab.add('stardust', 'a lot')).toThrow(TypeError);
      expect(() => lab.add('stardust', -1)).toThrow(RangeError);
    });
  });
});

describe('Laboratory reactions execution', () => {
  test('make consumes reagents and produces products', () => {
    const lab = new Laboratory(
      ['stardust', 'moonwater'],
      { stardust: 10, moonwater: 5 },
      {
        elixir: [
          [2, 'stardust'],
          [1, 'moonwater'],
        ],
      },
    );

    const produced = lab.make('elixir', 3);
    expect(produced).toBe(3);
    expect(lab.getQuantity('stardust')).toBe(4);
    expect(lab.getQuantity('moonwater')).toBe(2);
    expect(lab.getQuantity('elixir')).toBe(3);
  });

  test('make only produces what reagents allow', () => {
    const lab = new Laboratory(
      ['stardust'],
      { stardust: 5 },
      {
        gem: [[2, 'stardust']],
      },
    );

    expect(lab.make('gem', 4)).toBe(2.5);
    expect(lab.getQuantity('stardust')).toBe(0);
  });

  test('make handles reactions using products as reagents', () => {
    const lab = new Laboratory(
      ['stardust', 'moonwater'],
      { stardust: 4, moonwater: 2 },
      {
        elixir: [
          [2, 'stardust'],
          [1, 'moonwater'],
        ],
        potion: [[1, 'elixir']],
      },
    );

    const produced = lab.make('potion', 2);
    expect(produced).toBe(2);
    expect(lab.getQuantity('elixir')).toBe(0);
    expect(lab.getQuantity('stardust')).toBe(0);
    expect(lab.getQuantity('moonwater')).toBe(0);
    expect(lab.getQuantity('potion')).toBe(2);
  });

  test('make returns 0 for unknown products or zero quantity', () => {
    const lab = new Laboratory(['stardust']);
    expect(lab.make('unknown', 1)).toBe(0);
    expect(() => lab.make('unknown', -1)).toThrow(RangeError);
    expect(lab.make('unknown', 0)).toBe(0);
  });
});
