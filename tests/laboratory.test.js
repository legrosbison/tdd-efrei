const { Laboratory } = require('../src/Laboratory');

describe('Laboratory initialization', () => {
  test('starts with zero quantity for each known substance', () => {
    const lab = new Laboratory(['stardust', 'moonwater']);
    expect(lab.getQuantity('stardust')).toBe(0);
    expect(lab.getQuantity('moonwater')).toBe(0);
  });
});
