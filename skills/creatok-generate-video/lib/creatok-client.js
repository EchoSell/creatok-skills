const fs = require('node:fs/promises');
const path = require('node:path');
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

function contentTypeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const type = map[ext];
  if (!type) {
    throw new Error(`Unsupported image file type for upload: ${filePath}`);
  }
  return type;
}

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

  async submitTask({ prompt, orientation, seconds, definition, model, referenceImageKeys }) {
    const body = { prompt, orientation, seconds, definition, model };
    if (referenceImageKeys && referenceImageKeys.length > 0) body.referenceImageKeys = referenceImageKeys;

    const payload = await this.requestJson('POST', `${this.cfg.baseUrl}/api/open/skills/tasks`, {
      body,
      timeoutSec: 60,
    });
    if (payload.code !== 0) {
      throw new Error(`CreatOK task submission failed: ${JSON.stringify(payload)}`);
    }
    return payload.data || {};
  }

  async createImageUpload({ fileName, fileType, fileSize, prefix, timeoutSec = 60 }) {
    const payload = await this.requestJson('POST', `${this.cfg.baseUrl}/api/open/skills/upload/image/presigned`, {
      body: { fileName, fileType, fileSize, prefix },
      timeoutSec,
    });
    if (payload.code !== 0) {
      throw new Error(`CreatOK image upload init failed: ${JSON.stringify(payload)}`);
    }
    return payload.data || {};
  }

  async uploadImageFile(filePath, { prefix = 'open-skills/reference-images', timeoutSec = 60 } = {}) {
    const fileName = path.basename(filePath);
    const fileType = contentTypeForFile(filePath);
    const file = await fs.readFile(filePath);
    const upload = await this.createImageUpload({
      fileName,
      fileType,
      fileSize: file.byteLength,
      prefix,
      timeoutSec,
    });
    if (!upload.presignedUploadUrl || !upload.objectKey) {
      throw new Error(`Invalid upload init response: ${JSON.stringify(upload)}`);
    }

    const response = await fetch(upload.presignedUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': fileType },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Image upload failed with HTTP ${response.status}.`);
    }
    return upload.objectKey;
  }

  async getTaskStatus(taskId) {
    const payload = await this.requestJson(
      'GET',
      `${this.cfg.baseUrl}/api/open/skills/tasks/status?task_id=${encodeURIComponent(taskId)}&task_type=video_generation`,
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
