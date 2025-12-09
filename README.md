# Tritorc Image Optimizer (v2)

Internal Next.js tool for the Tritorc team to optimize, compress and convert images.

## Key Features

- Tritorc-themed UI (red & white)
- Admin-only login (env-based credentials)
- Drag & drop upload (single + multiple)
- Thumbnail previews for all images
- Image info / metadata inspector (type, size, resolution)
- Sorting (by name, size, type) & format filter
- Drag-to-reorder queue
- Target size slider (KB)
- Quality slider
- Resize slider (percentage)
- EXIF metadata strip toggle
- Preset buttons:
  - Website
  - WhatsApp
  - Catalogue
  - LinkedIn Ad
  - Email
  - PPT
- Auto optimize mode (adjusts settings based on images)
- File naming modes (keep original, suffix, timestamp, custom prefix)
- Bulk processing with ZIP download
- Single-image optimization with before/after preview modal
- Local recent activity log (localStorage)
- Built on Next.js App Router + Tailwind CSS + Sharp + JSZip

## Setup

```bash
npm install
npm run dev
```

Optional admin credentials via env:

- NEXT_PUBLIC_ADMIN_EMAIL
- NEXT_PUBLIC_ADMIN_PASSWORD

Defaults:

- Email: `admin@tritorc.com`
- Password: `tritorc123`
```
# tritorc-image-remover
