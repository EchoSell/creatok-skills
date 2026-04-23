const { getCreatokConfig } = require('./config');

function summarizeHttpError(status, url) {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  if (status === 401) {
    return `Unauthorized calling ${pathname}. Check CREATOK_API_KEY.`;
  }
  if (status === 404) {
    return `Endpoint not found at ${pathname}. Check the CreatOK base URL and deployment.`;
  }
  if (status >= 500) {
    return `CreatOK server error calling ${pathname}. Try again later.`;
  }
  return `HTTP ${status} calling ${pathname}.`;
}

class CreatokCapabilitiesClient {
  constructor(cfg) {
    this.cfg = cfg;
  }

  async requestJson(method, url, { timeoutSec = 60 } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutSec) * 1000);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.cfg.openSkillsKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(`Invalid response from CreatOK endpoint ${url}.`);
      }

      if (!response.ok) {
        throw new Error(summarizeHttpError(response.status, url));
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getCapabilities(timeoutSec = 60) {
    const payload = await this.requestJson('GET', `${this.cfg.baseUrl}/api/open/skills/capabilities`, {
      timeoutSec,
    });
    if (payload.code !== 0) {
      throw new Error(`CreatOK capabilities failed: ${JSON.stringify(payload)}`);
    }
    return payload.data || {};
  }
}

function defaultCapabilitiesClient() {
  return new CreatokCapabilitiesClient(getCreatokConfig());
}

module.exports = {
  CreatokCapabilitiesClient,
  defaultCapabilitiesClient,
};
