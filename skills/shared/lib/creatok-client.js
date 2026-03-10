const { getCreatokConfig } = require('./config');

class CreatokOpenSkillsClient {
  constructor(cfg) {
    this.cfg = cfg;
  }

  async requestJson(method, url, { body, timeoutSec = 60 } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutSec) * 1000);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.cfg.openSkillsKey}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error(`Invalid JSON response: ${error}\nBody: ${text.slice(0, 500)}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} calling ${url}. Body: ${text.slice(0, 500)}`);
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async analyze(tiktokUrl, timeoutSec = 180) {
    const payload = await this.requestJson('POST', `${this.cfg.baseUrl}/api/open/skills/analyze`, {
      body: { tiktok_url: tiktokUrl },
      timeoutSec,
    });
    if (payload.code !== 0) {
      throw new Error(`CreatOK analyze failed: ${JSON.stringify(payload)}`);
    }
    return payload.data || {};
  }

  async submitTask(prompt, ratio, model) {
    const payload = await this.requestJson('POST', `${this.cfg.baseUrl}/api/open/skills/tasks`, {
      body: { prompt, ratio, model },
      timeoutSec: 60,
    });
    if (payload.code !== 0) {
      throw new Error(`CreatOK task submission failed: ${JSON.stringify(payload)}`);
    }
    return payload.data || {};
  }

  async getTaskStatus(taskId) {
    const payload = await this.requestJson(
      'GET',
      `${this.cfg.baseUrl}/api/open/skills/tasks/status?task_id=${encodeURIComponent(taskId)}`,
      { timeoutSec: 60 },
    );
    if (payload.code !== 0) {
      throw new Error(`CreatOK task status failed: ${JSON.stringify(payload)}`);
    }
    return payload.data || {};
  }
}

function defaultClient() {
  return new CreatokOpenSkillsClient(getCreatokConfig());
}

module.exports = {
  CreatokOpenSkillsClient,
  defaultClient,
};
