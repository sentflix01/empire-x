'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Crown, Monitor, PenLine, Sparkles } from "lucide-react";
import BuilderPreview from "@/components/showroom/BuilderPreview";
import { getShowroomTemplateSamples } from "@/lib/showroomTemplateSamples";
import { useTranslation } from 'react-i18next';

const titleCase = (value = "") =>
  value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());

export default function ShowroomSamplePreview() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template") || "";
  const category = searchParams.get("category") || "";
  const templateName = titleCase(templateId);
  const samples = getShowroomTemplateSamples(templateName, category);
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet">("mobile");

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setPreviewMode(query.matches ? "tablet" : "mobile");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const createUrl = (sampleId: string) =>
    `/showroom/create?template=${encodeURIComponent(templateId)}&category=${encodeURIComponent(category)}&sample=${sampleId}`;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950 md:pb-6">
      <div className="border-b border-border/60 bg-background/95">
        <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Link href="/showroom/templates" className="mt-0.5 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <Crown className="h-3.5 w-3.5" />
                    Sample Preview
                  </span>
                  {category && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                      {category}
                    </span>
                  )}
                </div>
                <h1 className="mt-1.5 text-lg font-black tracking-normal text-foreground sm:text-2xl">
                  {templateName || "Template"} samples
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  Compare the Starter and Premium structures before opening the builder. Choose the one closest to your business, then customize the content.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <Link
                href={createUrl("starter")}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
              >
                <PenLine className="h-4 w-4" />
                Customize Starter
              </Link>
              <Link
                href={createUrl("premium")}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-purple-700"
              >
                <Sparkles className="h-4 w-4" />
                Customize Premium
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="grid gap-5 xl:grid-cols-2">
          {samples.map(sample => (
            <section key={sample.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Monitor className={sample.id === "premium" ? "h-4 w-4 text-purple-600" : "h-4 w-4 text-blue-600"} />
                    <h2 className="text-lg font-black text-foreground">{sample.name}</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{sample.desc}</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{sample.activeSections.length} sections included</p>
                </div>
                <Link
                  href={createUrl(sample.id)}
                  className={`inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-xs font-bold text-white sm:h-9 sm:w-auto ${
                    sample.id === "premium"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Customize this sample
                </Link>
              </div>

              <div className="h-[min(620px,calc(100dvh-14rem))] min-h-[420px] bg-slate-100 p-2 dark:bg-slate-900 sm:h-[72vh] sm:min-h-[560px] sm:p-3">
                <BuilderPreview
                  formData={sample.formData}
                  activeSections={sample.activeSections}
                  mode={previewMode}
                  showWhatsapp
                  fontFamily="Inter"
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
