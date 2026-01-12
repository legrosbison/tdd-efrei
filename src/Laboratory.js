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

  make(productName, desiredQuantity) {
    const normalizedProduct = this.#normalizeName(productName);
    if (!normalizedProduct) {
      throw new TypeError(`Invalid substance name: ${String(productName)}`);
    }

    const requestedQuantity = this.#normalizeQuantity(desiredQuantity);
    if (requestedQuantity === 0) {
      return 0;
    }

    if (!this.#recipes.has(normalizedProduct)) {
      return 0;
    }

    return this.#makeInternal(normalizedProduct, requestedQuantity, new Set());
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

  #makeInternal(productName, requestedQuantity, stack) {
    if (stack.has(productName)) {
      throw new RangeError(
        `Circular reaction detected while producing: ${productName}`
      );
    }

    const recipe = this.#recipes.get(productName);
    if (!recipe) {
      return 0;
    }

    stack.add(productName);
    recipe.forEach((reagent) => {
      const requiredQuantity = reagent.quantity * requestedQuantity;
      this.#ensureReagentAvailability(
        reagent.substance,
        requiredQuantity,
        stack
      );
    });

    const actualQuantity = recipe.reduce((min, reagent) => {
      if (reagent.quantity === 0) {
        return min;
      }

      const available = this.#inventory.get(reagent.substance);
      const possible = available / reagent.quantity;
      return Math.min(min, possible);
    }, requestedQuantity);

    if (actualQuantity <= 0 || !Number.isFinite(actualQuantity)) {
      stack.delete(productName);
      return 0;
    }

    recipe.forEach((reagent) => {
      const consumption = reagent.quantity * actualQuantity;
      this.#inventory.set(
        reagent.substance,
        this.#inventory.get(reagent.substance) - consumption
      );
    });

    this.#inventory.set(
      productName,
      this.#inventory.get(productName) + actualQuantity
    );
    stack.delete(productName);
    return actualQuantity;
  }

  #ensureReagentAvailability(substanceName, requiredQuantity, stack) {
    const current = this.#inventory.get(substanceName);
    const missing = requiredQuantity - current;
    if (missing <= 0) {
      return;
    }

    if (!this.#recipes.has(substanceName)) {
      return;
    }

    this.#makeInternal(substanceName, missing, stack);
  }
}

module.exports = { Laboratory };
