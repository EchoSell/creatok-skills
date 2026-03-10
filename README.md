# CreatOK Skills

A set of skills for TikTok creators, sellers, and operators to:

- analyze videos
- rewrite reference videos
- generate new videos

These skills work through CreatOK's remote APIs. You only need to install them and configure your API key.

## Manual Install (Without CLI)

Clone the repository first:

```bash
git clone https://github.com/EchoSell/creatok-skills.git
cd creatok-skills
```

Install to OpenClaw:

```bash
mkdir -p ~/.agents/skills
cp -R skills/* ~/.agents/skills/
```

Install to Claude Code:

```bash
mkdir -p ~/.claude/skills
cp -R skills/* ~/.claude/skills/
```

Install to Codex:

```bash
mkdir -p ~/.codex/skills
cp -R skills/* ~/.codex/skills/
```

After installation, you should see these skills:

```bash
creatok:video-analyze
creatok:video-remix
creatok:video-generate
creatok:task-status
```

## Configure Your API Key

Generate your API key at [https://www.creatok.ai/app/user/api-keys](https://www.creatok.ai/app/user/api-keys).

Set your CreatOK Open Skills API key:

```bash
export CREATOK_API_KEY="ok_xxx"
```

If you use OpenClaw, you can also configure the key in `openclaw.json`.

Add the `CREATOK_API_KEY` field under the `env` section in `$OPENCLAW_STATE_DIR/openclaw.json`:

```text
Please help me set the `env` field in `$OPENCLAW_STATE_DIR/openclaw.json` and add `CREATOK_API_KEY` with the value `{your generated key}`.
```

## How To Use

Just say things like these in chat:

Analyze a TikTok video:

```text
Analyze this TikTok video for me: https://www.tiktok.com/@xxx/video/123
```

Rewrite a reference video for your own product:

```text
Use this TikTok as a reference and rewrite it for my product: https://www.tiktok.com/@xxx/video/123
```

Generate a new video:

```text
Generate a TikTok-style video for a pet store opening. Make it upbeat and memorable.
```

Check an existing task:

```text
Check this video generation task for me: task_xxx
```

## What These Skills Are Good For

- analyzing selling videos
- breaking down viral scripts
- recreating or remixing competitor videos
- adapting a reference video to your own product
- generating a final video from an approved script or brief

## FAQ

I installed the skills but cannot see them yet:

- Restart OpenClaw, Claude Code, or Codex and try again.

Why do I need to copy `shared`:

- It contains shared runtime code used by all three skills. If you only copy a single skill directory, imports may fail at runtime.

My API key is configured but calls still fail:

- Check `CREATOK_API_KEY`
- Check whether your machine can access [https://www.creatok.ai/app/user/api-keys](https://www.creatok.ai/app/user/api-keys)

If you need to report an issue to an engineer, include the error message and the skill name you were using.
