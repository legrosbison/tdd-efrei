class Laboratory {
  constructor(knownSubstances, initialStock = {}, reactions = {}) {
    this.#inventory = this.#buildBaseInventory(knownSubstances);
    this.#recipes = this.#buildRecipes(reactions);
    this.#applyInitialStock(initialStock);
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
  #recipes;

  #buildBaseInventory(knownSubstances) {
    if (!Array.isArray(knownSubstances)) {
      throw new TypeError("Laboratory expects an array of known substances");
    }
    if (knownSubstances.length === 0) {
      throw new RangeError("At least one substance must be provided");
    }

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

      inventory.set(normalizedName, 0);
    });

    return inventory;
  }

  #buildRecipes(reactions) {
    this.#assertPlainObject(
      reactions,
      "Reactions must be provided as an object literal"
    );

    const recipes = new Map();
    for (const [productName, reagents] of Object.entries(reactions)) {
      const normalizedProduct = this.#normalizeName(productName);
      if (!normalizedProduct) {
        throw new TypeError(
          `Invalid product name in reactions: ${String(productName)}`
        );
      }

      if (this.#inventory.has(normalizedProduct)) {
        throw new RangeError(`Duplicate substance name: ${normalizedProduct}`);
      }

      recipes.set(
        normalizedProduct,
        this.#normalizeReagents(reagents, normalizedProduct)
      );
      this.#inventory.set(normalizedProduct, 0);
    }

    return recipes;
  }

  #applyInitialStock(initialStock) {
    this.#assertPlainObject(
      initialStock,
      "Initial stock must be provided as an object literal"
    );

    for (const [name, quantity] of Object.entries(initialStock)) {
      const normalizedName = this.#normalizeName(name);
      if (!normalizedName) {
        throw new Error(
          `Invalid substance name in initial stock: ${String(name)}`
        );
      }

      if (!this.#inventory.has(normalizedName)) {
        throw new ReferenceError(
          `Initial stock references unknown substance: ${normalizedName}`
        );
      }

      this.#inventory.set(normalizedName, this.#normalizeQuantity(quantity));
    }
  }

  #normalizeName(value) {
    if (typeof value !== "string") {
      return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue.length > 0 ? normalizedValue : null;
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

  #normalizeReagents(reagents, productName) {
    if (!Array.isArray(reagents) || reagents.length === 0) {
      throw new TypeError(
        `Reactions for ${productName} must be a non-empty array`
      );
    }

    return reagents.map((entry, index) => {
      if (!Array.isArray(entry) || entry.length !== 2) {
        throw new TypeError(
          `Invalid reagent definition at index ${index} for ${productName}`
        );
      }

      const [quantity, substanceName] = entry;
      const normalizedSubstance = this.#normalizeName(substanceName);
      if (!normalizedSubstance) {
        throw new TypeError(
          `Invalid substance name in reaction for ${productName}: ${String(
            substanceName
          )}`
        );
      }

      if (!this.#inventory.has(normalizedSubstance)) {
        throw new ReferenceError(
          `Reaction references unknown substance: ${normalizedSubstance}`
        );
      }

      return {
        substance: normalizedSubstance,
        quantity: this.#normalizeQuantity(quantity),
      };
    });
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

  #assertPlainObject(value, message) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(message);
    }
  }
}

module.exports = { Laboratory };
