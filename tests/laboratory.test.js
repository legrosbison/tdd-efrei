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
});
