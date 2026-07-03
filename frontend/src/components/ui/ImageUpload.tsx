// @ts-nocheck
/**
 * ImageUpload — reusable image picker + uploader.
 *
 * Single image usage (avatar, cover, logo):
 *   <ImageUpload value={url} onChange={setUrl} />
 *
 * Multiple images (product gallery):
 *   <ImageUpload multiple value={urls} onChange={setUrls} max={5} />
 *
 * The component shows a live preview and uploads to the backend on file select.
 */
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { uploadFile, uploadFiles } from '@/lib/uploadFile';
import { cn } from '@/lib/utils';

export default function ImageUpload({
  value,           // string (single) | string[] (multiple)
  onChange,        // (url: string) => void  |  (urls: string[]) => void
  multiple = false,
  max = 10,
  accept = 'image/*',
  className,
  placeholder,
  aspectRatio,     // e.g. "aspect-square", "aspect-video"
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const urls = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : [];

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');

    // Validate sizes (10 MB each)
    const oversized = files.find(f => f.size > 10 * 1024 * 1024);
    if (oversized) {
      setError('Max file size is 10 MB');
      return;
    }

    setUploading(true);
    try {
      if (multiple) {
        const remaining = max - urls.length;
        const batch = files.slice(0, remaining);
        const newUrls = await uploadFiles(batch);
        onChange([...urls, ...newUrls]);
      } else {
        const url = await uploadFile(files[0]);
        onChange(url);
      }
    } catch (err) {
      setError('Upload failed. Try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeUrl = (idx) => {
    if (multiple) {
      onChange(urls.filter((_, i) => i !== idx));
    } else {
      onChange('');
    }
  };

  // ── Single image ───────────────────────────────────────────────────────────
  if (!multiple) {
    return (
      <div className={cn('relative', className)}>
        <label className={cn(
          'flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed border-border',
          'cursor-pointer hover:bg-secondary/30 transition-colors overflow-hidden',
          aspectRatio || 'aspect-square',
          value && 'border-solid border-border/30'
        )}>
          {value ? (
            <img src={value} alt="upload preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
              {uploading
                ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                : <Upload className="w-6 h-6" />
              }
              <span className="text-xs text-center">{placeholder || 'Click to upload'}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
            disabled={uploading}
          />
        </label>

        {value && (
          <button
            type="button"
            onClick={() => removeUrl(0)}
            className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            aria-label="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {uploading && value && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  // ── Multiple images ────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2 flex-wrap">
        {urls.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border/50 shrink-0">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeUrl(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {urls.length < max && (
          <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/30 transition-colors shrink-0">
            {uploading
              ? <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              : (
                <>
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                </>
              )
            }
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={max > 1}
              className="hidden"
              onChange={handleChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

