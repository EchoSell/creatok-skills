---
name: creatok-generate-image
version: "1.0.0"
description: "This skill should be used when the user asks to generate an image, create an AI image, produce a product image, generate a visual from a prompt, or check and continue an existing image generation task. Generates images through CreatOK's image generation API and can also recover interrupted generation flows from an existing task id."
license: Internal
compatibility: "Claude Code ≥1.0, OpenClaw skills, ClawHub-compatible installers. Requires network access to CreatOK Open Skills API. No local image rendering packages required."
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
    - image-generation
    - ai-image
    - text-to-image
    - product-image
    - seedream
    - nano-banana
    - prompt-to-image
  triggers:
    - "generate an image"
    - "create an image"
    - "generate a product image"
    - "make an image from this prompt"
    - "create an AI image"
    - "generate a visual"
    - "text to image"
    - "produce an image"
    - "start image generation"
    - "generate it as an image"
    - "check this image generation task"
    - "did my image finish"
    - "check this image task id"
    - "画像を生成して"
    - "画像を作って"
    - "商品画像を作って"
    - "このプロンプトで画像を作って"
    - "이미지 생성해줘"
    - "이미지 만들어줘"
    - "상품 이미지 만들어줘"
    - "이 프롬프트로 이미지를 만들어줘"
    - "genera una imagen"
    - "crea una imagen"
    - "genera una imagen de producto"
    - "convierte este prompt en una imagen"
    - "gere uma imagem"
    - "crie uma imagem"
    - "gere uma imagem de produto"
    - "transforme este prompt em uma imagem"
---

# generate-image

## Constraints

- The model's final user-facing response should match the user's input language, default **English**.
- Must request **user confirmation** before triggering any paid/high-cost image generation call.
- After confirmed, must call **CreatOK Open Skills proxy** and wait until completion.
- Avoid technical wording in the user-facing reply unless the user explicitly needs details for debugging.

## Model Selection Rules

- `Seedream 5.0 Lite`
  - actual model id: `seedream-5.0-lite`
  - faster and lighter, good for quick iteration
  - resolutions: **2K, 4K only**

- `Nano Banana Pro`
  - actual model id: `nano-banana-pro`
  - highest quality, best for photorealistic portraits and product shots
  - resolutions: **1K, 2K, 4K**

- `Nano Banana 2`
  - actual model id: `nano-banana-2`
  - latest Nano Banana, best overall quality
  - resolutions: **1K, 2K, 4K**

The model should recommend a model before generation based on the use case:

- **portraits / photorealistic people** → `nano-banana-2`
- **product shots / e-commerce** → `nano-banana-pro`
- **general illustration / concept art** → `nano-banana-2`
- **quick preview / iteration** → `seedream-5.0-lite`
- **user explicitly wants 1K** → `nano-banana-pro` or `nano-banana-2` (Seedream does not support 1K)

## Inputs to clarify (ask if missing)

- ask only for what is necessary to generate a good image
- if resolution or aspect ratio is not specified, use sensible defaults (2K, square)
- if the prompt is vague, offer to refine it before confirming generation
- reference images are optional — ask only if the user implies style transfer or subject reference

## Workflow

1. **Confirmation gate** (mandatory)

- Summarize:
  - model
  - resolution
  - number of images (`n`)
  - aspect ratio if specified
  - estimated cost/credits if available
- Ask for a simple confirmation before submitting.
- Do **not** submit the generation task until user says yes.

2. Submit image generation

- Call CreatOK: `POST /api/open/skills/image-generation`

3. Poll status until completion

- Call CreatOK: `GET /api/open/skills/tasks/status?task_id=...&task_type=image_generation`

4. Persist artifacts + respond

- Write:
  - `outputs/result.json` with `task_id/status/images/raw`
  - `outputs/result.md`
- Persist the `task_id` immediately after submission so the user can recover later.
- Return the final image URLs verbatim.

## Existing Task Recovery

- If the user already has a `task_id`, continue from that task instead of starting a new one.
- In recovery mode, do not ask the user to restate the prompt if the task id is already available.
- The model can either check status once or keep polling if the user wants to wait.
- If the task succeeded, return the final image URLs verbatim.
- If the task is still queued or running, explain clearly and offer to keep checking.
- If the task failed, explain the failure and suggest next steps.

## Artifacts

All artifacts under `generate-image/.artifacts/<run_id>/...`.

## Thin Client Boundary

- This skill submits generation jobs, polls status, and persists fixed-format outputs.
- The model should not make the user restate their idea if the direction is already clear from the conversation.
