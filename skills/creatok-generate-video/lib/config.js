function getCreatokConfig() {
  const apiKey = process.env.CREATOK_API_KEY;

  if (!apiKey) {
    throw new Error('Missing CREATOK_API_KEY. Set env CREATOK_API_KEY before running this skill.');
  }

  return {
    baseUrl: 'https://www.creatok.ai',
    openSkillsKey: String(apiKey),
  };
}

module.exports = {
  getCreatokConfig,
};
