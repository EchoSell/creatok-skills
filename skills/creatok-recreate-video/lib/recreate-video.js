const { artifactsForRun } = require('./artifacts');
const { runAnalyzeVideo } = require('./analyze-video');

async function runRecreateVideo({
  tiktokUrl,
  runId,
  skillDir,
  analyzeSkillDir,
  angle = null,
  brand = null,
  style = null,
  analyzeRunner = runAnalyzeVideo,
}) {
  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const analyzeRunId = `${runId}--analyze`;
  const analyzeResult = await analyzeRunner({
    tiktokUrl,
    runId: analyzeRunId,
    skillDir: analyzeSkillDir,
  });

  const recreateSource = {
    reference: { tiktok_url: tiktokUrl },
    constraints: { angle, brand, style },
    analyze_run_id: analyzeResult.runId,
    analyze_artifacts_dir: analyzeResult.artifactsDir,
    analyze_result: analyzeResult.result,
  };

  artifacts.writeJson('outputs/recreate_source.json', recreateSource);

  return {
    runId,
    artifactsDir: artifacts.root,
  };
}

module.exports = {
  runRecreateVideo,
};
