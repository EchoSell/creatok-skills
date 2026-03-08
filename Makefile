CREATOK_BASE_URL ?= https://www.creatok.ai

help:
	@echo "Targets:"
	@echo "  test-e2e       Run smoke e2e checks without external network calls"
	@echo "  test-analyze   Run video-analyze against a sample TikTok URL"
	@echo "  test-vision    Call CreatOK /vision using a real frame (if present)"


test-e2e:
	python3 tests/e2e_smoke.py


test-analyze:
	# For analyze, config.local.json is sufficient (env var optional)
	CREATOK_BASE_URL="$(CREATOK_BASE_URL)" \
		python3 video-analyze/scripts/run.py --tiktok_url "https://www.tiktok.com/@midlife.nursing/video/7609047163334675742" --run_id "make-demo" --vision --max_frames 1


test-vision:
	@if [ -z "$$CREATOK_API_KEY" ]; then echo "Missing CREATOK_API_KEY"; exit 2; fi
	python3 -c "import base64,json,os; p='video-analyze/.artifacts/creatok-proxy-test/frames/frame_00001.jpg'; b=base64.b64encode(open(p,'rb').read()).decode(); print(json.dumps({'frames':[{'name':'frame_00001.jpg','mime':'image/jpeg','base64':b}],'model':'gemini-2.5-flash','prompt':'Describe.'}))" | \
		curl -sS "$(CREATOK_BASE_URL)/api/open/skills/vision" -H "Authorization: Bearer $$CREATOK_API_KEY" -H "Content-Type: application/json" -d @- | head -c 1200
	@echo
