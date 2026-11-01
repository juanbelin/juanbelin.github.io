# Research posts

All 48 original blog posts are in `src/content/research/`. Their original text,
images, dates, categories, tags and pinned status have been retained. Interface
text stays in English; posts may be written in any language.

Use this frontmatter for a new Markdown post:

```yaml
---
title: My article
description: A short description of the post.
date: 2026-11-01
categories: [CTF, HackTheBox]
tags: [web, easy]
image: /assets/img/my-article/cover.png
pin: false
draft: false
---
```

Store images in `public/assets/img/` and link to them with `/assets/img/...`.
External image URLs are also supported. Categories and tags accept any names.
They appear on cards and article pages, and both can filter the Research list.
Set `pin: true` to pin a post above unpinned entries on the Research index.
Set `draft: true` to exclude a post from listings and generated article pages.

Research cards show covers on the right, including in the homepage's latest
posts section. Article covers are also used in social sharing metadata.

Projects contains the four selected GitHub README imports. Blog posts,
including those about tools, remain in Research.

## Migration record

`migration-report.json` records the imported files and copied assets. The
original repository was left unchanged. The importer normalized 28 filenames
that contained literal `%20` strings, converted Jekyll YouTube embeds into
iframes, removed Liquid raw wrappers and Chirpy prompt markers, and repaired one
Obsidian image embed. Code blocks and post languages were preserved. Uppercase
code language labels were lowercased for syntax highlighting. The Administrator
post had an empty title, so its filename supplied the title. Where an original
frontmatter key appeared twice, the final value was retained as in Jekyll.

Old `/posts/Original-Slug/` URLs redirect to the matching Research article.
GitHub Pages serves these as static HTML redirects.

The one-time importer is `scripts/migrate-jekyll.mjs`. Re-running it overwrites
the migrated posts with content from the original blog, so edit the new Markdown
files directly for future updates.

## Article features and social previews

Code fences display their Markdown language and include a Copy button. Unlabelled
blocks display `text`. Article images (including covers) open in a gallery with
previous/next controls, arrow keys, Escape to close, and swipe navigation on touch
screens. Further Reading recommendations omit cover images.

The build generates a 1200 × 630 JPEG social card for every published Research
post at `/og/research/<slug>.jpg`. Local covers are included; posts with external
covers receive a title card without requiring external downloads at build time.
Open Graph metadata includes the absolute image URL, dimensions and MIME type.
The visible article cover remains unchanged.

LinkedIn must be able to access the published article and its social image; it
cannot inspect a local preview. After deployment, use
https://www.linkedin.com/post-inspector/ if LinkedIn retains an old preview.

## Markdown callouts

Callouts work without JavaScript and support lists, links, images, code blocks,
nested callouts and custom titles. Types are case-insensitive:

```markdown
> [!warning]
> Something to keep in mind.

> [!tip] A custom title
> The **formatted** body of the tip.

> [!note]- Expand this note
> This is collapsed by default. Use `+` instead of `-` to start expanded.
```

Supported styles include note, info, tip, success, question, warning, danger,
important, example and quote, plus aliases such as caution, error and hint.
Unknown types use the note style. Ordinary blockquotes and fenced code samples
are preserved.

Migrated posts share their original public `/posts/<legacySlug>/` URLs rather
than unpublished `/research/` URLs. The legacy pages include complete Open Graph
metadata, redirect to the new article and preserve section fragments. New posts
without `legacySlug` share their Research URL and must be published before
LinkedIn can fetch them.


Research is paginated at ten posts per page, with static URLs such as
`/research/page/2/`. Category and tag filters search every published post, not
just the current page, and keep their values when changing pages. Pagination
and filters are reflected in the URL and support browser history. Thumbnail
covers use the earlier 4:3 layout. Preview metadata reads, for example,
`28 May 2026 · 6 min read`.
