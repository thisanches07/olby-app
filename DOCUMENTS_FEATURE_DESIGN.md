# Documents Feature Design

## Goal

Create a premium documents experience for Obly that supports project plants, contracts, receipts, reports, invoices, photos, and technical files without making the app feel heavy.

The feature should feel:

- calm
- precise
- minimal
- trustworthy
- fast even with large files

## Product Principle

The app never treats documents as screen data.

The UI loads only lightweight metadata first:

- id
- projectId
- title
- category
- file extension
- sizeBytes
- uploadedBy
- createdAt
- pageCount
- status
- thumbnailUrl
- linkedExpenseId
- linkedTaskId

The original file is fetched only when the user explicitly opens it.

## User Value

For engineers:

- central place for project plants and technical files
- easy upload from file picker, scanner, camera, and gallery
- link documents to expenses and project milestones
- send clients a clean, trustworthy project record

For clients:

- one place to find the latest plant, report, invoice, receipt, or signed contract
- no need to ask in WhatsApp for files again
- confidence that the project is documented and organized

## Information Architecture

Documents should exist in two levels:

1. Project document center
2. Contextual document attachments

Project document center:

- plants
- contracts
- technical reports
- invoices
- permits
- delivery files
- general documents

Contextual attachments:

- expense receipts
- diary attachments
- task attachments

This gives the user one clean place to browse everything while preserving context in expenses and diary entries.

## Core Screens

### 1. Documents Hub

Path:

- client: tab inside project screen
- engineer: tab inside project screen

Purpose:

- browse all project documents
- search and filter
- upload new files
- quickly preview latest important files

Layout:

- large quiet header
- segmented filter row
- pinned section for key files
- recent documents section
- grouped list by category

Top summary block:

- "Documents"
- subtle project subtitle
- metadata chips:
  - total files
  - total storage used
  - last updated

Filters:

- All
- Plants
- Contracts
- Financial
- Reports
- Photos
- Other

Quick scopes:

- Recent
- Pinned
- Shared with client

Search behavior:

- title
- file name
- category
- uploader

### 2. Document Detail Sheet

Purpose:

- lightweight preview before opening full asset

Content:

- title
- category
- uploader
- upload date
- size
- pages
- linked project item
- actions

Actions:

- preview
- download
- share
- rename
- move category
- pin
- delete

Use a bottom sheet instead of a full page for speed and elegance.

### 3. Full Preview Screen

Purpose:

- open the real file only when needed

Behavior:

- images open instantly with zoom
- PDFs open with first-page preview immediately, then progressive load
- unsupported formats show metadata and "Open externally"

Important:

- preview uses signed URL or temporary URL
- do not preload full files in lists
- do not keep entire file blobs in React state

### 4. Upload Composer

Entry points:

- upload button in documents hub
- add attachment inside expense
- add attachment inside diary

Actions:

- file picker
- scan document
- camera
- gallery

After selecting files:

- user chooses category
- optional title override
- optional note
- optional link to expense/task/diary entry
- optional mark as visible to client

## Apple-Level Visual Direction

## Tone

The design should feel like Files + Notes + Wallet, not like an admin panel.

Use:

- quiet surfaces
- strong typography hierarchy
- careful spacing
- soft separators
- clear iconography
- almost no noisy borders

Avoid:

- card overload
- heavy shadows everywhere
- bright warning colors unless truly needed
- crowded metadata on first glance

## Visual System

Suggested palette direction:

- background: warm white or blue-tinted white
- primary text: near-black
- secondary text: cool gray
- accent: your existing blue, but used sparingly
- status colors: muted and refined

Suggested surfaces:

- page background: very light neutral
- primary card: pure white
- pinned document card: faint blue-tinted highlight
- destructive actions: hidden until explicit

## Typography

Hierarchy:

- page title: large, compact, confident
- section title: medium, quiet
- document title: medium emphasis
- metadata: small, subdued

Document rows should feel editorial, not form-like.

## Motion

Use motion only to clarify:

- upload progress fills smoothly
- opening detail sheet feels springy and direct
- filters animate with subtle opacity and scale
- preview transitions feel continuous

No decorative animations.

## Layout Proposal

### Documents Hub wireframe

```text
┌─────────────────────────────────────┐
│ Documents                           │
│ Project record and technical files  │
│ 24 files   86 MB   Updated today    │
├─────────────────────────────────────┤
│ [All] [Plants] [Contracts] [More]   │
│ Search documents...                 │
├─────────────────────────────────────┤
│ Pinned                              │
│ ┌─────────────────────────────────┐ │
│ │ Executive Plant v3         PDF  │ │
│ │ Updated 2 days ago              │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Recent                              │
│ Plant - Ground Floor           PDF  │
│ Invoice - Concrete             PDF  │
│ Site Report - Week 08          PDF  │
│ Kitchen Reference Photo        JPG  │
└─────────────────────────────────────┘
```

### Document row behavior

Each row should show:

- file icon or thumbnail
- title
- one metadata line
- subtle type badge
- chevron or more menu

Example metadata line:

- "PDF · 4.2 MB · 12 pages · 14 Mar"

## Performance Architecture

This is the most important part.

## What the app should load on list screens

Only:

- document metadata
- generated thumbnail URL if available
- upload status

Never load:

- PDF bytes
- image originals
- base64 payloads
- full file contents

## Storage model

Recommended backend model:

### documents table

- id
- projectId
- title
- originalFileName
- category
- mimeType
- extension
- sizeBytes
- pageCount
- checksum
- storageKey
- thumbnailStorageKey
- uploadedByUserId
- visibility
- linkedExpenseId
- linkedTaskId
- linkedDiaryEntryId
- isPinned
- createdAt
- updatedAt

### delivery strategy

- metadata from API
- signed thumbnail URL for list
- signed original URL only on open

## Upload flow

1. App requests upload slot from API
2. API returns document id and signed upload URL
3. App uploads file directly to storage
4. App confirms completion
5. Backend generates thumbnail and extracts metadata asynchronously
6. UI reflects statuses:
   - Uploading
   - Processing
   - Ready
   - Failed

This keeps your API server from carrying large file traffic.

## Preview strategy

Images:

- list uses thumbnail
- preview uses medium-resolution derivative first
- original loads only on zoom or explicit download if needed

PDFs:

- list uses generated first-page thumbnail
- detail screen loads lightweight preview image first
- full PDF viewer fetches only on demand

CAD or unsupported technical formats:

- show file card with metadata
- allow download/open externally

## Caching rules

- cache metadata normally with API layer
- cache thumbnails short-term
- do not permanently cache large originals unless explicitly downloaded
- purge preview cache opportunistically

## págination

For project document center:

- fetch 20 items initially
- páginate on scroll
- keep search server-side when possible

This matters more than file size because long lists can feel heavy even when files are remote.

## Role Rules

Engineer:

- upload
- rename
- recategorize
- pin
- delete
- attach to expense/task/diary
- choose client visibility

Client:

- browse visible documents
- preview
- download
- share link if allowed

## Suggested Categories

- PLANT
- CONTRACT
- REPORT
- INVOICE
- RECEIPT
- PERMIT
- PHOTO
- DELIVERY
- OTHER

Do not expose too many categories at first. Keep it opinionated.

## Smart Behaviors

### Pinned files

Allow engineers to pin only a few high-value files:

- latest approved plant
- signed contract
- most recent report

This prevents the client from feeling lost.

### Versioning

For plants and reports, support soft versioning:

- Plant v1
- Plant v2
- Plant v3

The newest version becomes primary, older ones remain available in a compact history sheet.

### Visibility

Each document can be:

- internal only
- visible to client

This is especially useful for technical files or internal cost documents.

## Empty States

Engineer empty state:

- elegant illustration
- message: "Keep the project record organized."
- CTA: "Upload first document"

Client empty state:

- message: "No files shared yet."
- quieter tone, no blame

## Notifications

Useful events:

- new document shared with client
- document upload finished processing
- new plant version available
- invoice uploaded

Do not notify for every single internal upload.

## MVP Scope

Phase 1:

- documents hub
- upload from file picker
- categories
- list with thumbnails
- detail sheet
- preview on demand
- attach receipt to expense
- client visibility

Phase 2:

- scan flow
- pinning
- version history
- better search and filters
- diary attachments in hub

Phase 3:

- OCR for receipts
- report generation
- document requests from client
- approval workflow

## Recommended UI Components For This Repo

Based on the current codebase, the feature should likely be split into:

- `components/documents/documents-hub.tsx`
- `components/documents/document-row.tsx`
- `components/documents/document-filter-bar.tsx`
- `components/documents/document-detail-sheet.tsx`
- `components/documents/document-preview-screen.tsx`
- `components/documents/document-upload-sheet.tsx`

Hooks:

- `hooks/use-project-documents.ts`
- `hooks/use-document-upload.ts`

Services:

- `services/project-documents.service.ts`

Possible routes:

- `app/document/[id].tsx`

## Integration With Existing Product

Best integration points:

- replace the current placeholder "documentos" area in project views
- surface receipt documents already attached to expenses
- later merge diary attachments into the same hub

The project context should not store document blobs.

It may store at most:

- document count
- pinned document summary
- latest document timestamp

Everything else should be fetched per screen.

## Final Recommendation

Build documents as a calm project archive, not a file dump.

The premium feeling will come from:

- strong curation
- clear categories
- beautiful metadata presentation
- fast previews
- disciplined loading strategy

If built this way, documents become one of the strongest trust features in Obly without making the app heavy.
