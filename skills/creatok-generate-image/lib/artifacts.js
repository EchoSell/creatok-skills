const fs = require('node:fs');
const path = require('node:path');

class Artifacts {
  constructor(root) {
    this.root = root;
  }

  ensure() {
    for (const name of ['input', 'transcript', 'vision', 'outputs', 'logs']) {
      fs.mkdirSync(path.join(this.root, name), { recursive: true });
    }
  }

  writeJson(relPath, obj) {
    const filePath = path.join(this.root, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
    return filePath;
  }

  writeText(relPath, text) {
    const filePath = path.join(this.root, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');
    return filePath;
  }
}

function artifactsRootForSkill(skillDir) {
  return path.join(skillDir, '.artifacts');
}

function artifactsForRun(skillDir, runId) {
  return new Artifacts(path.join(artifactsRootForSkill(skillDir), runId));
}

module.exports = {
  Artifacts,
  artifactsRootForSkill,
  artifactsForRun,
};
