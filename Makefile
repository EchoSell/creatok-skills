help:
	@echo "Targets:"
	@echo "  test-e2e       Run smoke e2e checks without external network calls"
	@echo "  test-analyze   Run analyze-video against a sample TikTok URL"


test-e2e:
	node tests/e2e_smoke.js


test-analyze:
	node skills/creatok-analyze-video/scripts/run.js --tiktok_url "https://www.tiktok.com/@midlife.nursing/video/7609047163334675742" --run_id "make-demo"
