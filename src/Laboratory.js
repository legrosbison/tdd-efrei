class Laboratory {
  constructor(knownSubstances, initialStock = {}) {
    this.#inventory = this.#buildInventory(knownSubstances, initialStock);
  }

  getQuantity(name) {
    const normalizedName = this.#resolveKnownSubstance(name);
    return this.#inventory.get(normalizedName);
  }

  add(name, quantity) {
    const normalizedName = this.#resolveKnownSubstance(name);
    const normalizedQuantity = this.#normalizeQuantity(quantity);
    const updatedQuantity =
      this.#inventory.get(normalizedName) + normalizedQuantity;
    this.#inventory.set(normalizedName, updatedQuantity);
    return updatedQuantity;
  }

  #inventory;

  #buildInventory(knownSubstances, initialStock) {
    if (!Array.isArray(knownSubstances)) {
      throw new TypeError("Laboratory expects an array of known substances");
    }
    if (knownSubstances.length === 0) {
      throw new RangeError("At least one substance must be provided");
    }

    const normalizedInitialStock = this.#normalizeInitialStock(initialStock);
    const inventory = new Map();

    knownSubstances.forEach((name, index) => {
      const normalizedName = this.#normalizeName(name);
      if (!normalizedName) {
        throw new TypeError(
          `Invalid substance name at index ${index}: ${String(name)}`
        );
      }

      if (inventory.has(normalizedName)) {
        throw new RangeError(`Duplicate substance name: ${normalizedName}`);
      }

      const startingQuantity = normalizedInitialStock.get(normalizedName) ?? 0;

      inventory.set(normalizedName, startingQuantity);
      normalizedInitialStock.delete(normalizedName);
    });

    if (normalizedInitialStock.size > 0) {
      const { value: unknownName } = normalizedInitialStock.keys().next();
      throw new ReferenceError(
        `Initial stock references unknown substance: ${unknownName}`
      );
    }

    return inventory;
  }

  #normalizeName(value) {
    if (typeof value !== "string") {
      return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  #normalizeInitialStock(initialStock) {
    if (
      initialStock === null ||
      typeof initialStock !== "object" ||
      Array.isArray(initialStock)
    ) {
      throw new TypeError("Initial stock must be provided as an object literal");
    }

    const normalized = new Map();
    for (const [name, quantity] of Object.entries(initialStock)) {
      const normalizedName = this.#normalizeName(name);
      if (!normalizedName) {
        throw new Error(
          `Invalid substance name in initial stock: ${String(name)}`
        );
      }

      normalized.set(normalizedName, this.#normalizeQuantity(quantity));
    }

    return normalized;
  }

  #normalizeQuantity(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Quantity must be a finite number: ${String(value)}`);
    }

    if (value < 0) {
      throw new RangeError(
        `Quantity cannot be negative. Received: ${String(value)}`
      );
    }

    return value;
  }

  #resolveKnownSubstance(name) {
    const normalizedName = this.#normalizeName(name);
    if (!normalizedName) {
      throw new TypeError(`Invalid substance name: ${String(name)}`);
    }

    if (!this.#inventory.has(normalizedName)) {
      throw new ReferenceError(`Unknown substance: ${normalizedName}`);
    }

    return normalizedName;
  }
}

module.exports = { Laboratory };
