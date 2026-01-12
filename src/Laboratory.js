class Laboratory {
  constructor(knownSubstances) {
    if (!Array.isArray(knownSubstances)) {
      throw new TypeError("Laboratory expects an array of known substances");
    }

    this.#inventory = new Map();

    knownSubstances.forEach((name, index) => {
      const normalizedName = this.#normalizeName(name);
      if (!normalizedName) {
        throw new Error(
          `Invalid substance name at index ${index}: ${String(name)}`
        );
      }

      if (this.#inventory.has(normalizedName)) {
        throw new Error(`Duplicate substance name: ${normalizedName}`);
      }

      this.#inventory.set(normalizedName, 0);
    });
  }

  getQuantity(name) {
    const normalizedName = this.#normalizeName(name);
    if (!normalizedName || !this.#inventory.has(normalizedName)) {
      throw new Error(`Unknown substance: ${String(name)}`);
    }

    return this.#inventory.get(normalizedName);
  }

  #inventory;

  #normalizeName(value) {
    if (typeof value !== "string") {
      return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }
}

module.exports = { Laboratory };
