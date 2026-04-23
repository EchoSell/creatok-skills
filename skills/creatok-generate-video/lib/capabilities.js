function invalidContract(message) {
  return new Error(`Invalid capabilities contract: ${message}`);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !isNonEmptyString(item))) {
    throw invalidContract(`${field} must be a non-empty array of strings`);
  }
}

function normalizePricing(pricing, field) {
  if (!isPlainObject(pricing)) {
    return null;
  }
  if (pricing.currency !== 'credits') {
    throw invalidContract(`${field}.currency must be 'credits'`);
  }
  if (pricing.unit !== 'video') {
    throw invalidContract(`${field}.unit must be 'video'`);
  }
  if (!Array.isArray(pricing.estimates)) {
    throw invalidContract(`${field}.estimates must be an array`);
  }
  return {
    currency: 'credits',
    unit: 'video',
    estimates: pricing.estimates.map((item, index) => {
      if (!isPlainObject(item)) {
        throw invalidContract(`${field}.estimates[${index}] must be an object`);
      }
      if (!isNonEmptyString(item.definition)) {
        throw invalidContract(`${field}.estimates[${index}].definition must be a non-empty string`);
      }
      if (typeof item.seconds !== 'number' || Number.isNaN(item.seconds)) {
        throw invalidContract(`${field}.estimates[${index}].seconds must be a number`);
      }
      if (!isNonEmptyString(item.orientation)) {
        throw invalidContract(`${field}.estimates[${index}].orientation must be a non-empty string`);
      }
      if (typeof item.credits !== 'number' || Number.isNaN(item.credits)) {
        throw invalidContract(`${field}.estimates[${index}].credits must be a number`);
      }
      return {
        definition: item.definition,
        seconds: Number(item.seconds),
        orientation: item.orientation,
        credits: Number(item.credits),
      };
    }),
  };
}

function assertNullableNumber(value, field) {
  if (value !== null && (typeof value !== 'number' || Number.isNaN(value))) {
    throw invalidContract(`${field} must be a number or null`);
  }
}

function normalizeDurations(durations, field) {
  if (!isPlainObject(durations)) {
    throw invalidContract(`${field} must be an object`);
  }

  assertNullableNumber(durations.min, `${field}.min`);
  assertNullableNumber(durations.max, `${field}.max`);

  if (durations.enum !== null) {
    if (
      !Array.isArray(durations.enum) ||
      durations.enum.length === 0 ||
      durations.enum.some((item) => typeof item !== 'number' || Number.isNaN(item))
    ) {
      throw invalidContract(`${field}.enum must be null or a non-empty array of numbers`);
    }
  }

  if (durations.enum === null && durations.min === null && durations.max === null) {
    throw invalidContract(`${field} must define enum or min/max bounds`);
  }

  return {
    min: durations.min === null ? null : Number(durations.min),
    max: durations.max === null ? null : Number(durations.max),
    enum: durations.enum === null ? null : [...durations.enum].map(Number),
  };
}

function normalizeVideoModel(model, field) {
  if (!isPlainObject(model)) {
    throw invalidContract(`${field} must be an object`);
  }
  if (!isNonEmptyString(model.id)) {
    throw invalidContract(`${field}.id must be a non-empty string`);
  }
  if (!isNonEmptyString(model.label)) {
    throw invalidContract(`${field}.label must be a non-empty string`);
  }
  if (!isPlainObject(model.defaults)) {
    throw invalidContract(`${field}.defaults must be an object`);
  }
  if (!isPlainObject(model.limits)) {
    throw invalidContract(`${field}.limits must be an object`);
  }
  if (!isNonEmptyString(model.defaults.orientation)) {
    throw invalidContract(`${field}.defaults.orientation must be a non-empty string`);
  }
  if (typeof model.defaults.seconds !== 'number' || Number.isNaN(model.defaults.seconds)) {
    throw invalidContract(`${field}.defaults.seconds must be a number`);
  }
  if (!isNonEmptyString(model.defaults.definition)) {
    throw invalidContract(`${field}.defaults.definition must be a non-empty string`);
  }
  assertStringArray(model.limits.definitions, `${field}.limits.definitions`);
  assertStringArray(model.limits.orientations, `${field}.limits.orientations`);
  if (typeof model.limits.max_reference_images !== 'number' || Number.isNaN(model.limits.max_reference_images)) {
    throw invalidContract(`${field}.limits.max_reference_images must be a number`);
  }

  return {
    id: model.id,
    label: model.label,
    defaults: {
      orientation: model.defaults.orientation,
      seconds: Number(model.defaults.seconds),
      definition: model.defaults.definition,
    },
    limits: {
      definitions: [...model.limits.definitions],
      orientations: [...model.limits.orientations],
      durations: normalizeDurations(model.limits.durations, `${field}.limits.durations`),
      maxReferenceImages: Number(model.limits.max_reference_images),
    },
    pricing: normalizePricing(model.pricing, `${field}.pricing`),
  };
}

function normalizeVideoCapabilities(payload) {
  const field = 'capabilities.video';
  if (!isPlainObject(payload)) {
    throw invalidContract(`${field} must be an object`);
  }
  if (!isNonEmptyString(payload.default_model)) {
    throw invalidContract(`${field}.default_model must be a non-empty string`);
  }
  if (!Array.isArray(payload.models)) {
    throw invalidContract(`${field}.models must be an array`);
  }

  const models = payload.models.map((model, index) => normalizeVideoModel(model, `${field}.models[${index}]`));
  if (models.length === 0) {
    throw invalidContract(`${field}.models must include at least one model`);
  }

  if (!models.some((model) => model.id === payload.default_model)) {
    throw invalidContract(`${field}.default_model must reference a model`);
  }

  return {
    defaultModel: payload.default_model,
    models,
  };
}

function buildUnsupportedVideoModelError(videoCapabilities, modelId) {
  return new Error(
    `Unsupported model: ${modelId}. Supported: ${videoCapabilities.models.map((model) => model.id).join(', ')}`,
  );
}

function summarizeModelSelection(model, { estimatedCredits = null } = {}) {
  const pricing = estimatedCredits == null ? '' : ` Estimated cost: ${estimatedCredits} credits.`;
  return `${model.label}.${pricing}`;
}

async function fetchVideoCapabilities({ client = null, timeoutSec = 60, defaultClient = null } = {}) {
  const effectiveClient = client || (typeof defaultClient === 'function' ? defaultClient() : null);
  if (!effectiveClient || typeof effectiveClient.getCapabilities !== 'function') {
    throw new Error('Missing capabilities client. Expected getCapabilities().');
  }

  const payload = await effectiveClient.getCapabilities(timeoutSec);
  if (!isPlainObject(payload)) {
    throw invalidContract('payload must be an object');
  }
  if (!isPlainObject(payload.capabilities)) {
    throw invalidContract('capabilities must be an object');
  }

  return normalizeVideoCapabilities(payload.capabilities.video);
}

module.exports = {
  buildUnsupportedVideoModelError,
  fetchVideoCapabilities,
  summarizeModelSelection,
};
