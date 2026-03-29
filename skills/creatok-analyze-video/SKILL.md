---
name: creatok-analyze-video
version: "1.0.0"
description: Use when analyzing a TikTok video or breaking down its script and structure.
license: Internal
compatibility: "Claude Code ≥1.0, OpenClaw skills, ClawHub-compatible installers. Requires network access to CreatOK Open Skills API. No local ffmpeg or vision setup required."
metadata:
  openclaw:
    requires:
      env: []
      bins:
        - node
    primaryEnv: CREATOK_API_KEY
  author: creatok
  version: "1.0.0"
  geo-relevance: "low"
  tags:
    - tiktok
    - tiktok-analysis
    - video-analysis
    - script-analysis
    - storyboard
    - hook-analysis
    - creator-workflow
    - seller-workflow
  triggers:
    - "analyze this TikTok video"
    - "analyze this TikTok"
    - "break down this TikTok"
    - "why does this TikTok work"
    - "show me the original script"
    - "show me the original storyboard"
    - "analyze this selling video"
    - "このTikTok動画を分析して"
    - "このTikTokを分析して"
    - "このTikTokを分解して"
    - "元の台本を見せて"
    - "이 틱톡 영상을 분석해줘"
    - "이 틱톡을 분석해줘"
    - "이 틱톡을 분해해줘"
    - "원본 대본을 보여줘"
    - "analiza este video de TikTok"
    - "analiza este TikTok"
    - "desglosa este TikTok"
    - "muéstrame el guion original"
    - "analise este vídeo do TikTok"
    - "analise este TikTok"
    - "quebre este TikTok"
    - "me mostre o roteiro original"
---

# analyze-video

## Constraints

- Platform: **TikTok only**.
- Analyze source: Extract transcript and visual notes from the TikTok URL.
- The model's final user-facing response should match the user's input language, default **English**.
- Avoid technical wording in the user-facing reply unless the user explicitly needs details for debugging or to share with a developer.
- Follow shared guidance in `./references/common-rules.md`.
- Input: **TikTok URL**.
- Artifacts must be written under `analyze-video/.artifacts/<run_id>/...`.

## What to produce (minimum)

Create:

- `outputs/result.json` (machine-readable, see `./references/contracts.md`)

The script gathers structured source data returned by CreatOK:

- transcript segments
- video metadata
- normalized vision result
- remote response text and suggestions

## Analysis Focus

The model should read `outputs/result.json` and produce the final user-facing analysis in the conversation.
Before deciding how to explain the result, the model should first infer what kind of TikTok video this is.
This classification is mainly for better guidance and analysis focus; it should not feel like a rigid taxonomy to the user.
Useful internal categories include:

- selling talking-head / direct pitch
- pain-point to solution
- product demo
- before / after
- review / comparison
- listicle / recommendation
- emotional or surprise hook
- non-selling content such as pet, entertainment, lifestyle, or story content

The model does not need to expose the category label unless it clearly helps the user.

## Analysis Angles

The model can infer and explain items such as:

- hook / value / proof / CTA
- highlights with timestamps
- storyboard / reusable template
- final written analysis or recommendations
- why the video can or cannot go viral from a short-form content operations perspective
- how the video works from a selling conversion perspective, including script, cover, audience, and conversion logic

Two especially useful framing options for the final user-facing analysis are:

- explain why the video can or cannot become a strong short-form performer from an operator's point of view
- break down the script, cover, audience, and conversion logic from a selling and transaction point of view

The analysis emphasis should follow the inferred video type:

- for selling videos, focus on conversion structure, selling-point order, proof, trust-building, and CTA
- for product demos, focus on what is shown first, how the product is demonstrated, and what makes the demo persuasive
- for before / after videos, focus on contrast strength, believability, and payoff timing
- for review / comparison videos, focus on credibility, differentiation, and decision-making signals
- for non-selling content, focus on hook, pacing, emotional pull, and what structure can be reused without forcing a selling analysis

## Output Preferences

- The default final response should include both:
  - the original script
  - a storyboard / scene breakdown table
- The final response should also include a short video-metrics section that evaluates the available data, such as:
  - duration
  - likes
  - views / plays
  - comments
  - shares / saves if available
  - a brief overall assessment of whether the public stats look healthy, weak, or unavailable
- Keep the metrics analysis simple and grounded in the available platform stats and source artifacts. The model should infer this directly in the final reply using the available raw metrics and source artifacts; do not invent platform engagement numbers or add a separate scripted metrics pipeline.
- Present the original script as a timestamped line-by-line script.
- Present the storyboard as a table with at least time range, scene summary, visual action, and spoken content / on-screen text.
- Prefer a clean readable structure such as one spoken line per row with its corresponding time range.
- Keep the final response easy for creators and sellers to scan and reuse.

## Next-Step Handoff

After presenting the analysis, the model should naturally guide the user into the next step.
Use a numbered list for the follow-up choices, and explicitly tell the user to reply with only the number.
The user should not need to copy the full option text.
Prefer a concise prompt such as:

1. Rewrite this for your product
2. Turn this into an AI-ready script
3. Break down the conversion logic

Then add a short instruction like:

- "Reply with 1, 2, or 3."
- "Just send the number, and I will continue."

The model should keep this handoff flexible and concise rather than forcing a rigid workflow.
When phrasing the options, keep them short and action-oriented so they are easy to answer with a single digit.

The next-step options should also reflect the inferred video type:

- for selling videos, prioritize viewing the original script, viewing the original storyboard, adapting it to the user's own product, or making a differentiated version
- for non-selling content, prioritize viewing the original script, viewing the original storyboard, or adapting the idea to the user's own topic

Unless the user explicitly asks for a live-action shoot version, the model should treat recreation and follow-up generation as AI-generated video work by default.
The default path is to help the user move toward an AI-generation-ready script or brief.
After giving a useful AI-oriented version, the model may optionally ask whether the user also wants a live-action shoot version.

If the reference appears to be a product-selling video and the user wants to recreate it, the model should first collect the user's own product context before drafting the recreated script.
Ask only for the highest-impact details first, such as:

- product name
- core selling points
- product images or reference materials if available
- price or offer details if they matter to the hook or CTA

If important details are still missing, the model should fill gaps through short follow-up questions step by step instead of requesting a large information dump up front.
The model should not ask for a long form, a detailed brief, or a large batch of requirements before showing useful progress.

## Workflow

1. **Create run folder**

- Use user-provided `run_id`
- Create `analyze-video/.artifacts/<run_id>/{input,transcript,vision,outputs,logs}`

2. **Run analyze**

- Run the CreatOK analyze step
- Persist:
  - `input/video_details.json`
  - `transcript/transcript.json` (segments)
  - `transcript/transcript.txt`
  - `vision/vision.json`

3. **Write artifacts**

- `outputs/result.json`

## Notes

- Keep it deterministic and portable: write source data artifacts and let the model analyze them in the conversation.
- Favor momentum after the analysis. The default next step is to help the user view the original materials or move toward recreation / remix.
- For selling-video recreation, gather a small set of key product details first, then refine through lightweight follow-up questions only when needed.
