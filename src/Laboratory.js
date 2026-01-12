class Laboratory {
  constructor(knownSubstances, initialStock = {}, reactions = {}) {
    this.#inventory = this.#buildBaseInventory(knownSubstances);
    this.#recipes = this.#buildRecipes(reactions);
    this.#componentLookup = new Map();
    this.#components = [];
    this.#analyzeReactionGraph();
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
  #components;
  #componentLookup;

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

    const normalizedProducts = [];
    const seenProducts = new Set();
    for (const productName of Object.keys(reactions)) {
      const normalizedProduct = this.#normalizeName(productName);
      if (!normalizedProduct) {
        throw new TypeError(
          `Invalid product name in reactions: ${String(productName)}`
        );
      }

      if (
        this.#inventory.has(normalizedProduct) ||
        seenProducts.has(normalizedProduct)
      ) {
        throw new RangeError(`Duplicate substance name: ${normalizedProduct}`);
      }

      seenProducts.add(normalizedProduct);
      normalizedProducts.push({ original: productName, name: normalizedProduct });
      this.#inventory.set(normalizedProduct, 0);
    }

    const recipes = new Map();
    normalizedProducts.forEach(({ original, name }) => {
      recipes.set(name, this.#normalizeReagents(reactions[original], name));
    });

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
    const component = this.#componentLookup.get(productName);
    if (component?.isCyclic) {
      return this.#makeFromCyclicComponent(
        component,
        productName,
        requestedQuantity
      );
    }

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
    const contextStack = stack ?? new Set();
    const current = this.#inventory.get(substanceName);
    const missing = requiredQuantity - current;
    if (missing <= 0) {
      return;
    }

    if (!this.#recipes.has(substanceName)) {
      return;
    }

    this.#makeInternal(substanceName, missing, contextStack);
  }

  #makeFromCyclicComponent(component, productName, desiredQuantity) {
    if (desiredQuantity <= 0) {
      return 0;
    }

    const size = component.products.length;
    const demandVector = Array(size).fill(0);
    const targetIndex = component.indexMap.get(productName);
    if (targetIndex === undefined) {
      return 0;
    }
    demandVector[targetIndex] = desiredQuantity;

    const productionTotals = this.#multiplyMatrixVector(
      component.inverse,
      demandVector
    );

    const stockUsage = [];
    const plannedProduction = [];
    component.products.forEach((product, index) => {
      const needed = productionTotals[index];
      const available = this.#inventory.get(product);
      const targetDemand = index === targetIndex ? desiredQuantity : 0;
      const internalDemand = Math.max(0, needed - targetDemand);
      const usableFromStock =
        index === targetIndex
          ? Math.min(available, internalDemand)
          : Math.min(available, needed);
      stockUsage[index] = usableFromStock;
      plannedProduction[index] = needed - usableFromStock;
    });

    const externalRequirements = new Map();
    component.products.forEach((product, index) => {
      const produced = plannedProduction[index];
      if (produced === 0) {
        return;
      }

      const recipe = this.#recipes.get(product);
      recipe.forEach((reagent) => {
        if (!component.productSet.has(reagent.substance)) {
          const amount = reagent.quantity * produced;
          if (amount === 0) {
            return;
          }

          externalRequirements.set(
            reagent.substance,
            (externalRequirements.get(reagent.substance) ?? 0) + amount
          );
        }
      });
    });

    if (externalRequirements.size === 0) {
      return 0;
    }

    externalRequirements.forEach((amount, substance) => {
      this.#ensureReagentAvailability(substance, amount, new Set());
    });

    let scale = 1;
    externalRequirements.forEach((amount, substance) => {
      if (amount === 0) {
        return;
      }

      const available = this.#inventory.get(substance);
      if (available === undefined) {
        scale = 0;
        return;
      }

      scale = Math.min(scale, available / amount);
    });

    if (scale <= 0 || !Number.isFinite(scale)) {
      return 0;
    }

    const scaledProductionPlan = plannedProduction.map(
      (value) => value * scale
    );

    component.products.forEach((product, index) => {
      const produced = scaledProductionPlan[index];
      if (produced === 0) {
        return;
      }

      this.#inventory.set(
        product,
        this.#inventory.get(product) + produced
      );
    });

    component.products.forEach((product, index) => {
      const produced = scaledProductionPlan[index];
      if (produced === 0) {
        return;
      }

      const recipe = this.#recipes.get(product);
      recipe.forEach((reagent) => {
        const consumption = reagent.quantity * produced;
        if (consumption === 0) {
          return;
        }

        const current = this.#inventory.get(reagent.substance);
        const updated = current - consumption;
        this.#inventory.set(
          reagent.substance,
          Math.abs(updated) < 1e-12 ? 0 : updated
        );
      });
    });

    return desiredQuantity * scale;
  }

  #analyzeReactionGraph() {
    this.#componentLookup.clear();
    this.#components = [];

    const graph = new Map();
    this.#recipes.forEach((recipe, product) => {
      const edges = new Set();
      recipe.forEach((reagent) => {
        if (this.#recipes.has(reagent.substance)) {
          edges.add(reagent.substance);
        }
      });
      graph.set(product, edges);
    });

    if (graph.size === 0) {
      return;
    }

    const indices = new Map();
    const lowlinks = new Map();
    const stack = [];
    const onStack = new Set();
    const components = [];
    let index = 0;

    const strongConnect = (node) => {
      indices.set(node, index);
      lowlinks.set(node, index);
      index += 1;
      stack.push(node);
      onStack.add(node);

      graph.get(node).forEach((neighbor) => {
        if (!indices.has(neighbor)) {
          strongConnect(neighbor);
          lowlinks.set(
            node,
            Math.min(lowlinks.get(node), lowlinks.get(neighbor))
          );
        } else if (onStack.has(neighbor)) {
          lowlinks.set(
            node,
            Math.min(lowlinks.get(node), indices.get(neighbor))
          );
        }
      });

      if (lowlinks.get(node) === indices.get(node)) {
        const componentProducts = [];
        let current;
        do {
          current = stack.pop();
          onStack.delete(current);
          componentProducts.push(current);
        } while (current !== node);

        const component = this.#createComponent(componentProducts);
        components.push(component);
        component.products.forEach((product) => {
          this.#componentLookup.set(product, component);
        });
      }
    };

    graph.forEach((_, node) => {
      if (!indices.has(node)) {
        strongConnect(node);
      }
    });

    this.#components = components;
  }

  #createComponent(products) {
    const componentProducts = products;
    const indexMap = new Map();
    componentProducts.forEach((product, idx) => {
      indexMap.set(product, idx);
    });
    const productSet = new Set(componentProducts);
    const hasSelfLoop = componentProducts.some((product) => {
      const recipe = this.#recipes.get(product) ?? [];
      return recipe.some(
        (reagent) => reagent.substance === product && reagent.quantity > 0
      );
    });
    const isCyclic = componentProducts.length > 1 || hasSelfLoop;

    const component = {
      products: componentProducts,
      indexMap,
      productSet,
      isCyclic,
      inverse: null,
    };

    if (isCyclic) {
      component.inverse = this.#computeComponentInverse(component);
    }

    return component;
  }

  #computeComponentInverse(component) {
    const size = component.products.length;
    const dependencyMatrix = Array.from({ length: size }, () =>
      Array(size).fill(0)
    );

    component.products.forEach((product, column) => {
      const recipe = this.#recipes.get(product);
      recipe.forEach((reagent) => {
        const row = component.indexMap.get(reagent.substance);
        if (row !== undefined) {
          dependencyMatrix[row][column] += reagent.quantity;
        }
      });
    });

    const systemMatrix = this.#identityMatrix(size);
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        systemMatrix[row][col] -= dependencyMatrix[row][col];
      }
    }

    return this.#invertMatrix(systemMatrix);
  }

  #identityMatrix(size) {
    return Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, col) => (row === col ? 1 : 0))
    );
  }

  #invertMatrix(matrix) {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => {
      const identityRow = Array(n).fill(0);
      identityRow[i] = 1;
      return [...row, ...identityRow];
    });

    for (let col = 0; col < n; col += 1) {
      let pivotRow = col;
      for (let row = col + 1; row < n; row += 1) {
        if (
          Math.abs(augmented[row][col]) >
          Math.abs(augmented[pivotRow][col])
        ) {
          pivotRow = row;
        }
      }

      const pivotValue = augmented[pivotRow][col];
      if (Math.abs(pivotValue) < Number.EPSILON) {
        throw new Error(
          "Circular reaction matrix is singular and cannot be resolved"
        );
      }

      if (pivotRow !== col) {
        [augmented[pivotRow], augmented[col]] = [
          augmented[col],
          augmented[pivotRow],
        ];
      }

      const pivotFactor = augmented[col][col];
      for (let j = 0; j < 2 * n; j += 1) {
        augmented[col][j] /= pivotFactor;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === col) {
          continue;
        }

        const factor = augmented[row][col];
        for (let j = 0; j < 2 * n; j += 1) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }

    return augmented.map((row) => row.slice(n));
  }

  #multiplyMatrixVector(matrix, vector) {
    return matrix.map((row) =>
      row.reduce((sum, value, index) => sum + value * vector[index], 0)
    );
  }
}

module.exports = { Laboratory };
