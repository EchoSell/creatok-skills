const { artifactsForRun } = require('./artifacts');
const { runVideoAnalyze } = require('./video-analyze');

async function runVideoRemix({
  tiktokUrl,
  runId,
  skillDir,
  analyzeSkillDir,
  angle = null,
  brand = null,
  style = null,
  analyzeRunner = runVideoAnalyze,
}) {
  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const analyzeRunId = `${runId}--analyze`;
  const analyzeResult = await analyzeRunner({
    tiktokUrl,
    runId: analyzeRunId,
    skillDir: analyzeSkillDir,
  });

  const remixSource = {
    reference: { tiktok_url: tiktokUrl },
    constraints: { angle, brand, style },
    analyze_run_id: analyzeResult.runId,
    analyze_artifacts_dir: analyzeResult.artifactsDir,
    analyze_result: analyzeResult.result,
  };

  artifacts.writeJson('outputs/remix_source.json', remixSource);

  return {
    runId,
    artifactsDir: artifacts.root,
  };
}

module.exports = {
  runVideoRemix,
};
