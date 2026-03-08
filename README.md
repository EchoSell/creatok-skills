# CreatOK Skills

A set of skills for TikTok creators, sellers, and operators to:

- analyze videos
- rewrite reference videos
- generate new videos

These skills work through CreatOK's remote APIs. You only need to install them and configure your API key.

## Before You Install

First configure your CreatOK Open Skills API key:

```bash
export CREATOK_BASE_URL="https://www.creatok.ai"
export CREATOK_API_KEY="ok_xxx"
```

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

## What These Skills Are Good For

- analyzing selling videos
- breaking down viral scripts
- recreating or remixing competitor videos
- adapting a reference video to your own product
- generating a final video from an approved script or brief

## FAQ

I installed the skills but cannot see them yet:
- Restart OpenClaw, Claude Code, or Codex and try again.

Why do I need to copy both `creatok_skills` and `shared`:
- They are shared runtime code. If you only copy a single skill directory, imports may fail at runtime.

My API key is configured but calls still fail:
- Check `CREATOK_API_KEY`
- Check `CREATOK_BASE_URL`
- Check whether your machine can access [https://www.creatok.ai](https://www.creatok.ai)

If you need to report an issue to an engineer, include the error message and the skill name you were using.
