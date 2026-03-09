CREATOK_BASE_URL ?= https://www.creatok.ai

help:
	@echo "Targets:"
	@echo "  test-e2e       Run smoke e2e checks without external network calls"
	@echo "  test-analyze   Run video-analyze against a sample TikTok URL"


test-e2e:
	python3 tests/e2e_smoke.py


test-analyze:
	# For analyze, config.local.json is sufficient (env var optional)
	CREATOK_BASE_URL="$(CREATOK_BASE_URL)" \
		python3 skills/creatok:video-analyze/scripts/run.py --tiktok_url "https://www.tiktok.com/@midlife.nursing/video/7609047163334675742" --run_id "make-demo"
