// Compact JSON Schema validator for the subset used by Kumite schemas.
// Supports local $ref, type, required, properties, additionalProperties,
// items, enum, const, pattern, string/number bounds, minItems/maxItems,
// oneOf/anyOf/allOf, if/then/else and basic uri/date formats.

const MAX_DEPTH = 200;

/**
 * Validate a value against a JSON Schema.
 * @param {unknown} value
 * @param {object} schema
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
export function validateSchema(value, schema) {
  const errors = [];
  visit(value, schema, "$", errors, schema, 0);
  return { valid: errors.length === 0, errors };
}

function visit(value, schema, path, errors, root, depth) {
  if (schema === true) return;
  if (schema === false) {
    errors.push({ path, message: "no value is allowed here" });
    return;
  }
  if (!isPlainObject(schema)) return;
  if (depth > MAX_DEPTH) {
    errors.push({ path, message: "schema recursion limit exceeded" });
    return;
  }

  if (typeof schema.$ref === "string") {
    const target = resolveRef(root, schema.$ref);
    if (target === undefined) {
      errors.push({
        path,
        message: `cannot resolve schema reference ${schema.$ref}`,
      });
    } else {
      visit(value, target, path, errors, root, depth + 1);
    }
    return;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push({
        path,
        message: `must be of type ${types.join(" or ")}`,
      });
      return;
    }
  }

  if (Object.prototype.hasOwnProperty.call(schema, "const")) {
    if (!deepEqual(value, schema.const)) {
      errors.push({
        path,
        message: `must equal ${describe(schema.const)}`,
      });
    }
  }

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.some((option) => deepEqual(value, option))) {
      errors.push({
        path,
        message: `must be one of: ${schema.enum.map(describe).join(", ")}`,
      });
    }
  }

  if (typeof value === "string") {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
      errors.push({
        path,
        message: `must contain at least ${schema.minLength} character(s)`,
      });
    }
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `must contain at most ${schema.maxLength} character(s)`,
      });
    }
    if (typeof schema.pattern === "string") {
      let regex;
      try {
        regex = new RegExp(schema.pattern, "u");
      } catch {
        errors.push({
          path,
          message: `schema pattern is not a valid regular expression: ${schema.pattern}`,
        });
      }
      if (regex && !regex.test(value)) {
        errors.push({
          path,
          message: `must match pattern ${schema.pattern}`,
        });
      }
    }
    if (typeof schema.format === "string") {
      const problem = checkFormat(value, schema.format);
      if (problem) errors.push({ path, message: problem });
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push({ path, message: `must be >= ${schema.minimum}` });
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push({ path, message: `must be <= ${schema.maximum}` });
    }
    if (
      typeof schema.exclusiveMinimum === "number" &&
      value <= schema.exclusiveMinimum
    ) {
      errors.push({ path, message: `must be > ${schema.exclusiveMinimum}` });
    }
    if (
      typeof schema.exclusiveMaximum === "number" &&
      value >= schema.exclusiveMaximum
    ) {
      errors.push({ path, message: `must be < ${schema.exclusiveMaximum}` });
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      errors.push({
        path,
        message: `must contain at least ${schema.minItems} item(s)`,
      });
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      errors.push({
        path,
        message: `must contain at most ${schema.maxItems} item(s)`,
      });
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) => {
        visit(item, schema.items, joinPath(path, index), errors, root, depth + 1);
      });
    }
  }

  if (isPlainObject(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          errors.push({
            path: joinPath(path, key),
            message: "required property is missing",
          });
        }
      }
    }

    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        visit(
          value[key],
          propertySchema,
          joinPath(path, key),
          errors,
          root,
          depth + 1,
        );
      }
    }

    if (schema.additionalProperties !== undefined) {
      for (const key of Object.keys(value)) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
        const extraPath = joinPath(path, key);
        if (schema.additionalProperties === false) {
          errors.push({
            path: extraPath,
            message: "additional property is not allowed",
          });
        } else if (
          isPlainObject(schema.additionalProperties) ||
          schema.additionalProperties === true
        ) {
          visit(
            value[key],
            schema.additionalProperties,
            extraPath,
            errors,
            root,
            depth + 1,
          );
        }
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) {
      visit(value, branch, path, errors, root, depth + 1);
    }
  }

  if (Array.isArray(schema.anyOf)) {
    const matched = schema.anyOf.some(
      (branch) => validateQuietly(value, branch, root, depth + 1),
    );
    if (!matched) {
      errors.push({
        path,
        message: `must match at least one of the ${schema.anyOf.length} allowed schemas`,
      });
    }
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((branch) =>
      validateQuietly(value, branch, root, depth + 1),
    ).length;
    if (matches !== 1) {
      errors.push({
        path,
        message: `must match exactly one of the ${schema.oneOf.length} allowed schemas (matched ${matches})`,
      });
    }
  }

  if (schema.if !== undefined) {
    const conditionHolds = validateQuietly(value, schema.if, root, depth + 1);
    if (conditionHolds && schema.then !== undefined) {
      visit(value, schema.then, path, errors, root, depth + 1);
    } else if (!conditionHolds && schema.else !== undefined) {
      visit(value, schema.else, path, errors, root, depth + 1);
    }
  }
}

function validateQuietly(value, schema, root, depth) {
  const errors = [];
  visit(value, schema, "$", errors, root, depth);
  return errors.length === 0;
}

function matchesType(value, type) {
  switch (type) {
    case "object":
      return isPlainObject(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true;
  }
}

function resolveRef(root, ref) {
  if (ref === "#") return root;
  if (!ref.startsWith("#/")) return undefined;
  const segments = ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current = root;
  for (const segment of segments) {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function checkFormat(value, format) {
  if (format === "uri") {
    try {
      const parsed = new URL(value);
      if (!parsed.protocol) return "must be an absolute URI";
      return null;
    } catch {
      return "must be a valid URI";
    }
  }
  if (format === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "must be a date in YYYY-MM-DD form";
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      return "must be a real calendar date";
    }
    return null;
  }
  return null;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(path, key) {
  if (typeof key === "number") return `${path}[${key}]`;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `${path}.${key}`;
  return `${path}[${JSON.stringify(key)}]`;
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
    );
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return (
      aKeys.length === bKeys.length &&
      aKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(b, key) &&
          deepEqual(a[key], b[key]),
      )
    );
  }
  return false;
}

function describe(value) {
  return JSON.stringify(value);
}
