# CreatOK CLI changelog

Changes in stable releases of CreatOK CLI and its bundled Skills. Dates for
historical versions reflect their tagged commits and may differ from publication dates.

## 1.2.17 — 2026-11-23

- The CLI now checks for required updates on its own release channel before affected online commands. You can review the update before confirming installation.
- Recover a paid job with `creatok jobs status --confirmation-id <id>` if you did not receive a task ID.
- Use `creatok jobs wait --confirmation-id <id>` to wait for the submission to finish and track the job through completion.

## 1.2.16 — 2026-11-21

- Some online actions now require the latest CLI version for your release channel.
- Review an update with `creatok update --version <version>` and install it with `creatok update --apply --version <version>` when you're ready.
- You can still check the status and recover the results of submitted jobs when an update is required.

## 1.2.15 — 2026-11-19

- Query capabilities by domain or model to find relevant options more easily. The `--domain` option is now required.
- Improved image and video model validation and support for image quality options.
- Accept capability fields separated by spaces as well as commas.

## 1.2.14 — 2026-11-19

- Start another content analysis while an earlier request is still pending.
- Resume local video analysis in a different output folder without uploading the same video again.
- Create or register other Avatars while an earlier Avatar request is still pending.

## 1.2.13 — 2026-11-17

- See what changed before updating CreatOK CLI.

## 1.2.12 — 2026-11-17

- Improved validation of image, video, and digital human inputs.
- Fixed video frame orientation checks.

## 1.2.11 — 2026-11-14

- Upload TikTok Shop videos up to 500 MiB.

## 1.2.10 — 2026-11-12

- Improved login reliability by keeping your session active for longer.

## 1.2.9 — 2026-11-10

- Improved recovery when preparing videos or covers for publishing is interrupted.
- Improved reliability when preparing multiple videos or covers on Windows.

## 1.2.8 — 2026-11-10

- Improved content analysis and video recreation.

## 1.2.7 — 2026-11-09

- Improved the browser sign-in experience.

## 1.2.6 — 2026-11-09

- Improved sign-in guidance.

## 1.2.5 — 2026-11-09

- Improved recovery and status checks when preparing publishing media.

## 1.2.4 — 2026-11-07

- Added visibility into TikTok Showcase synchronization.

## 1.2.3 — 2026-11-06

- Improved reliability when managing assets.

## 1.2.2 — 2026-10-30

- Improved analysis of videos and photo posts.

## 1.2.1 — 2026-10-28

- Improved guidance for publishing photos.

## 1.2.0 — 2026-10-27

- Improved recovery when preparing publishing media is interrupted.

## 1.1.0 — 2026-10-26

- Added browser sign-in and improved login reliability.

## 1.0.0 — 2026-10-23

- Improved the reliability of asset management, digital humans, and TikTok publishing.

## 0.19.0 — 2026-10-19

- Added cancellation for eligible TikTok Shop publishing tasks.

## 0.18.6 — 2026-10-12

- Improved video analysis.

## 0.18.5 — 2026-10-12

- Added a way to submit feedback from the CLI.

## 0.18.4 — 2026-10-10

- Added account notes to help identify TikTok publishing accounts.

## 0.18.3 — 2026-10-09

- Improved asset uploads and asset library access.

## 0.18.2 — 2026-10-09

- Added support for Nano Banana 2.1.

## 0.18.1 — 2026-10-08

- Improved recovery when CLI installation is incomplete.

## 0.18.0 — 2026-10-08

- Added Skills for creating and recreating shoppable photo carousels.

## 0.17.0 — 2026-09-30

- Added account information and support for installing Skills in WorkBuddy.

## 0.16.0 — 2026-09-28

- Improved the reliability of publishing information.

## 0.15.1 — 2026-09-23

- Improved video analysis guidance.

## 0.15.0 — 2026-09-22

- Added video character replacement.

## 0.14.2 — 2026-09-17

- Improved TikTok Shop selection for analytics.

## 0.14.1 — 2026-09-14

- Improved guidance for scheduled posts and AI content declarations.

## 0.14.0 — 2026-09-08

- Improved the TikTok publishing workflow.

## 0.13.0 — 2026-09-03

- Reorganized CLI commands to make them easier to find.

## 0.12.2 — 2026-09-03

- Improved guidance for resolving API key authentication errors.

## 0.12.1 — 2026-09-02

- Added tools for browsing, managing, and deleting assets, including recycle bin management.

## 0.12.0 — 2026-08-28

- Added TikTok Showcase support.

## 0.10.2 — 2026-08-11

- Added Seedance 2.5 and MiniMax H3 video support and improved video input validation.

## 0.11.0 — 2026-08-11

- Added Linux support.

## 0.10.1 — 2026-08-11

- Fixed release packaging and synchronized bundled Skills.

## 0.10.0 — 2026-08-06

- Added TikTok publishing support.

## 0.9.0 — 2026-08-06

- Added help writing prompts for Seedance 2 videos.

## 0.8.7 — 2026-08-05

- Improved support for reference images and videos.

## 0.8.6 — 2026-08-05

- Fixed CLI installation instructions.

## 0.8.5 — 2026-08-03

- Improved how generated media is presented.

## 0.8.4 — 2026-07-31

- Fixed help requests being reported as failed commands.

## 0.8.0 — 2026-07-31

- Added a way to preview supported actions before running them.

## 0.7.0 — 2026-07-27

- Added support for creating assets from local media.

## 0.6.0 — 2026-07-24

- Added automatic update checks and an option to update the CLI.

## 0.5.0 — 2026-07-21

- Added help with improving video prompts.

## 0.4.0 — 2026-07-18

- Added tools for working with images and videos.

## 0.3.3 — 2026-07-17

- Improved video generation with digital humans and reference frames.

## 0.3.2 — 2026-07-15

- Added previews for digital human media.

## 0.3.1 — 2026-07-10

- Improved the reliability of the CLI health check.

## 0.3.0 — 2026-07-10

- Improved update checks and the process for updating the CLI and Skills.

## 0.1.3 — 2026-07-10

- Fixed digital human creation so selected options are preserved.

## 0.1.4 — 2026-07-10

- Contains the same code as version 0.1.3.

## 0.1.2 — 2026-07-09

- Added digital human creation and support for generation options files.

## 0.1.1 — 2026-06-29

- Initial CLI release, with CreatOK Skills installation and update checks.
