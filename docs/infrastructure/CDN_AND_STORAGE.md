# Nodbusiness — CDN & File Storage Strategy

> How user uploads are stored, served, and optimized across the globe.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| CDN | Content Delivery Network |
| R2 | Cloudflare R2 — S3-compatible object storage with zero egress fees |
| S3 | Amazon Simple Storage Service |
| MIME | Multipurpose Internet Mail Extensions — file type identifier |
| UUID | Universally Unique Identifier — random filename for uploaded files |
| URL | Uniform Resource Locator |
| MB | Megabyte |
| GB | Gigabyte |
| API | Application Programming Interface |
| PoP | Point of Presence — CDN edge server location |
| LCP | Largest Contentful Paint — Core Web Vital for image load speed |

---
## Current State: Local Disk (Broken for Production)

```
⚠️  CRITICAL: User uploads currently saved to local Railway disk.
    Files are LOST on every Railway redeploy.
    Must migrate to Cloudflare R2 before public launch.
```

---

## Target Architecture: Cloudflare R2 + CDN

```
User uploads file
        │
        ▼
POST /api/upload (backend)
        │
  Validate: MIME type, size (< 10MB)
        │
        ▼
S3-compatible PUT to Cloudflare R2
        │
  Return: { url: 'https://pub-xxx.r2.dev/uploads/uuid.jpg' }
        │
        ▼
URL stored in database
        │
        ▼
User requests image
        │
        ▼
Cloudflare CDN serves from edge (300+ locations)
  → If cached: served in < 10ms
  → If not cached: fetched from R2 → cached → served
```

---

## Activating Cloudflare R2

### Step 1: Create R2 bucket
```
1. Go to: dash.cloudflare.com
2. R2 → Create bucket → Name: "nodbusiness-uploads"
3. R2 → Manage R2 API Tokens → Create Token
   Permissions: Object Read & Write
   Bucket: nodbusiness-uploads
4. Copy: Account ID, Access Key ID, Secret Access Key
```

### Step 2: Set environment variables
```bash
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=nodbusiness-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev  # from R2 bucket settings → Public Access
```

### Step 3: Enable public access
```
R2 Console → nodbusiness-uploads → Settings → Public Access → Allow Access
Copy the public URL: https://pub-xxxx.r2.dev
Set as R2_PUBLIC_URL
```

### Step 4: Verify (no code changes needed)
```bash
# The upload middleware already checks for R2 env vars
# If set → uses R2; if not → falls back to local disk
curl -X POST https://your-api.railway.app/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"
# Should return: { url: "https://pub-xxx.r2.dev/uploads/..." }
```

---

## File Organization in R2

```
nodbusiness-uploads/
├── avatars/          ← User profile photos
│   └── {userId}/avatar.jpg
├── covers/           ← Profile cover photos
│   └── {userId}/cover.jpg
├── products/         ← Product listing images
│   └── {productId}/{timestamp}-{index}.jpg
├── businesses/       ← Business logos + covers
│   └── {businessId}/logo.jpg
├── showrooms/        ← Showroom cover images
│   └── {showroomId}/cover.jpg
├── posts/            ← Post images
│   └── {postId}/image.jpg
├── stories/          ← Story media
│   └── {storyId}/media.jpg
└── messages/         ← Chat image uploads
    └── {conversationId}/{messageId}.jpg
```

**Naming convention:**
```javascript
const key = `${folder}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
```

---

## Image Optimization Strategy

### On Upload (backend)
```javascript
// Use sharp for compression before uploading to R2
const sharp = require('sharp');

// Resize to max 2000x2000, compress to 80% quality
const compressed = await sharp(originalBuffer)
  .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 80, progressive: true })
  .toBuffer();

// Upload compressed version to R2
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: key,
  Body: compressed,
  ContentType: 'image/jpeg',
  CacheControl: 'public, max-age=31536000', // Cache for 1 year
}));
```

**Size targets after compression:**
| Image type | Max dimensions | Max file size |
|---|---|---|
| Avatar | 400×400 | 50KB |
| Cover photo | 1200×400 | 150KB |
| Product image | 1000×1000 | 200KB |
| Post image | 1200×900 | 300KB |
| Story | 1080×1920 | 500KB |

### On Delivery (frontend)
```tsx
// next/image handles WebP conversion, lazy loading, srcset
<Image
  src={imageUrl}
  alt={altText}
  width={400}
  height={400}
  loading="lazy"
  quality={85}
  placeholder="blur"     // Shows blur while loading (future: upload blurhash to DB)
/>
```

---

## Cloudflare Cache Configuration

**Apply to R2 bucket via Cloudflare Transform Rules:**

```
# Cache images for 1 year (images are immutable — content-hashed filenames)
Rule: URI path matches /uploads/*
Action: Cache TTL = 31536000 (1 year)

# Cache avatars for 1 day (users change avatars occasionally)
Rule: URI path matches /uploads/avatars/*
Action: Cache TTL = 86400 (1 day)
```

**Cache headers set on upload:**
```javascript
CacheControl: 'public, max-age=31536000, immutable'
// "immutable" tells browsers: don't revalidate this URL
// Use content-hashed filenames so new uploads = new URL
```

---

## Storage Costs at Scale

| Storage used | R2 cost/month | AWS S3 equivalent | Savings |
|---|---|---|---|
| 10 GB | $0 (free) | $0.23 | $0.23 |
| 100 GB | $1.50 | $2.30 + $9 egress = $11.30 | $9.80 |
| 1 TB | $15 | $23 + $90 egress = $113 | $98 |
| 10 TB | $150 | $230 + $900 egress = $1,130 | $980 |

R2 has **zero egress fees** — the biggest advantage at scale.

---

## Video Storage (Future)

When video posts are built:

**Option 1: Cloudflare Stream ($5/1,000 min stored + $1/1,000 min delivered)**
```
- Automatic transcoding (1080p → 720p → 480p → 360p)
- Adaptive bitrate streaming (HLS)
- Thumbnail generation
- Embed via <Stream /> React component
- Good for Ethiopian mobile (serves 360p on slow connections)
```

**Option 2: Cloudflare R2 + Manual Transcoding**
```
- Upload raw video to R2
- Transcode via ffmpeg on Railway worker
- Store multiple resolutions
- HLS playlist generation
- More control, more work, cheaper at scale
```

**Recommendation:** Start with Cloudflare Stream (simplest). Switch to R2+ffmpeg at 10,000+ videos.

---

## File Upload Security

```javascript
// Current validation in backend/middleware/upload.ts:

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
];

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

// Validate before upload:
if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  return res.status(400).json({ error: 'File type not allowed' });
}

if (file.size > MAX_FILE_SIZE) {
  return res.status(400).json({ error: 'File too large (max 10MB)' });
}

// Additional security:
// - Never execute uploaded files (serve from different domain)
// - Scan for malware (ClamAV integration — future)
// - Strip EXIF data from images (privacy — removes GPS coordinates)
```

---

## Backup Strategy for Uploads

R2 is durable (11 nines: 99.999999999% durability) — same as AWS S3.
No separate backup needed for file storage.

For compliance: Enable R2 Object Versioning if overwriting files (keeps previous versions for 30 days).
