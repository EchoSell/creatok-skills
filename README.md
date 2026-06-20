# CreatOK Skills

AI Agent skills for TikTok creators, sellers, and operators:

- **analyze** TikTok videos (script, storyboard, conversion logic)
- **recreate** a reference video for your own product
- **generate** TikTok videos
- **generate** AI images

The skills are a thin layer over the **`creatok` CLI**, which handles all API
interaction (auth, upload, generation, polling, artifacts). You install the CLI,
and the CLI installs the skills.

## Install

### 1. Install the `creatok` CLI

```bash
npm install -g @creatok/cli
```

Verify:

```bash
creatok version
```

### 2. Install the skills

The skills ship embedded in the CLI, so they always match the CLI version:

```bash
creatok skills install
```

This writes the skills into your agent's skill directory (`~/.claude/skills`,
`~/.codex/skills`, `~/.agents/skills`). Restart your agent (Claude Code,
OpenClaw, Codex) and the skills appear.

To keep skills in sync after a CLI upgrade, `creatok doctor` reports any drift;
just run `creatok skills install` again.

## Configure your API key

Generate a key at [creatok.ai/app/workspace/api-keys](https://www.creatok.ai/app/workspace/api-keys),
then set it:

```bash
export CREATOK_API_KEY="ok_xxx"
```

## How to use

Just say things like these to your agent:

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

Generate an AI image:

```text
Generate an image of a sunset over mountains in 4K resolution
```

Check an existing generation task:

```text
Check this video generation task for me: task_xxx
```

## What these skills are good for

- analyzing selling videos and breaking down viral scripts
- recreating competitor or reference videos for your own product
- generating a final video from an approved script or brief
- generating AI images for marketing, social media, or creative projects
- recovering an interrupted generation task without starting over

## FAQ

**I installed the CLI but the skills don't show up.**
Run `creatok skills install`, then restart your agent.

**`creatok doctor` says my skills are out of sync.**
Run `creatok skills install` to resync them to the current CLI version.

**My API key is configured but calls still fail.**
- Check `CREATOK_API_KEY` is exported in the same shell.
- Check your machine can reach [creatok.ai](https://www.creatok.ai).
- If failures persist, upgrade the CLI (`npm update -g @creatok/cli`).

**Where did the old `cp skills/* ~/.claude/skills` install go?**
The skills are now distributed through the CLI (`creatok skills install`) so
their content always matches the CLI version. The old copy-the-folder method is
no longer used.
