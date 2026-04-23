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
  if (pricing.unit !== 'image') {
    throw invalidContract(`${field}.unit must be 'image'`);
  }
  if (!isPlainObject(pricing.by_resolution)) {
    throw invalidContract(`${field}.by_resolution must be an object`);
  }
  const byResolution = {};
  for (const [resolution, credits] of Object.entries(pricing.by_resolution)) {
    if (!isNonEmptyString(resolution)) {
      throw invalidContract(`${field}.by_resolution keys must be non-empty strings`);
    }
    if (typeof credits !== 'number' || Number.isNaN(credits)) {
      throw invalidContract(`${field}.by_resolution.${resolution} must be a number`);
    }
    byResolution[resolution] = Number(credits);
  }
  return {
    currency: 'credits',
    unit: 'image',
    byResolution,
  };
}

function assertNRange(range, field) {
  if (!isPlainObject(range)) {
    throw invalidContract(`${field} must be an object`);
  }
  if (typeof range.min !== 'number' || typeof range.max !== 'number') {
    throw invalidContract(`${field}.min and ${field}.max must be numbers`);
  }
}

function normalizeImageModel(model, field) {
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
  if (!isNonEmptyString(model.defaults.resolution)) {
    throw invalidContract(`${field}.defaults.resolution must be a non-empty string`);
  }
  if (typeof model.defaults.n !== 'number' || Number.isNaN(model.defaults.n)) {
    throw invalidContract(`${field}.defaults.n must be a number`);
  }
  assertStringArray(model.limits.resolutions, `${field}.limits.resolutions`);
  assertNRange(model.limits.n, `${field}.limits.n`);
  if (model.limits.aspect_ratios != null) {
    assertStringArray(model.limits.aspect_ratios, `${field}.limits.aspect_ratios`);
  }
  if (typeof model.limits.max_reference_images !== 'number' || Number.isNaN(model.limits.max_reference_images)) {
    throw invalidContract(`${field}.limits.max_reference_images must be a number`);
  }

  return {
    id: model.id,
    label: model.label,
    defaults: {
      resolution: model.defaults.resolution,
      n: Number(model.defaults.n),
    },
    limits: {
      resolutions: [...model.limits.resolutions],
      n: {
        min: Number(model.limits.n.min),
        max: Number(model.limits.n.max),
      },
      aspectRatios: Array.isArray(model.limits.aspect_ratios) ? [...model.limits.aspect_ratios] : null,
      maxReferenceImages: Number(model.limits.max_reference_images),
    },
    pricing: normalizePricing(model.pricing, `${field}.pricing`),
  };
}

function normalizeImageCapabilities(payload) {
  const field = 'capabilities.image';
  if (!isPlainObject(payload)) {
    throw invalidContract(`${field} must be an object`);
  }
  if (!isNonEmptyString(payload.default_model)) {
    throw invalidContract(`${field}.default_model must be a non-empty string`);
  }
  if (!Array.isArray(payload.models)) {
    throw invalidContract(`${field}.models must be an array`);
  }

  const models = payload.models.map((model, index) => normalizeImageModel(model, `${field}.models[${index}]`));
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

function buildUnsupportedImageModelError(imageCapabilities, modelId) {
  return new Error(
    `Unsupported model: ${modelId}. Supported: ${imageCapabilities.models.map((model) => model.id).join(', ')}`,
  );
}

function summarizeModelSelection(model, { estimatedCredits = null } = {}) {
  const pricing = estimatedCredits == null ? '' : ` Estimated cost: ${estimatedCredits} credits.`;
  return `${model.label}.${pricing}`;
}

async function fetchImageCapabilities({ client = null, timeoutSec = 60, defaultClient = null } = {}) {
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

  return normalizeImageCapabilities(payload.capabilities.image);
}

module.exports = {
  buildUnsupportedImageModelError,
  fetchImageCapabilities,
  summarizeModelSelection,
};
