"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { parseMyAnimeListXml, parseLetterboxdCsv, parseGoodreadsCsv, type ParsedEntry } from "@/lib/import/parsers";
import type { MediaType } from "@/lib/constants";

type FormatKey = "mal" | "letterboxd" | "goodreads";

interface ParsedJob {
  type: MediaType;
  entries: ParsedEntry[];
  label: string;
}

const FORMATS: Array<{ key: FormatKey; title: string; body: string; accept: string; source: string }> = [
  { key: "mal", title: "MyAnimeList", body: "Anime and/or manga list, exported as XML.", accept: ".xml", source: "myanimelist.net → Panel → Export List" },
  { key: "letterboxd", title: "Letterboxd", body: "Your diary.csv or ratings.csv from a full data export.", accept: ".csv", source: "Settings → Import & Export → Export Data" },
  { key: "goodreads", title: "Goodreads", body: "Your library export (all shelves).", accept: ".csv", source: "My Books → Import/Export → Export Library" },
];

const BATCH_SIZE = 6;

export default function ImportSection() {
  const [format, setFormat] = useState<FormatKey>("mal");
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ imported: number; noMatch: string[]; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const activeFormat = FORMATS.find((f) => f.key === format)!;

  const handleFile = async (file: File) => {
    setParsing(true);
    setSummary(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const newJobs: ParsedJob[] = [];
      if (format === "mal") {
        const { anime, manga } = parseMyAnimeListXml(text);
        if (anime.length) newJobs.push({ type: "anime", entries: anime, label: `${anime.length} anime title${anime.length === 1 ? "" : "s"}` });
        if (manga.length) newJobs.push({ type: "manga", entries: manga, label: `${manga.length} manga title${manga.length === 1 ? "" : "s"}` });
      } else if (format === "letterboxd") {
        const entries = parseLetterboxdCsv(text);
        if (entries.length) newJobs.push({ type: "movie", entries, label: `${entries.length} film${entries.length === 1 ? "" : "s"}` });
      } else {
        const entries = parseGoodreadsCsv(text);
        if (entries.length) newJobs.push({ type: "book", entries, label: `${entries.length} book${entries.length === 1 ? "" : "s"}` });
      }
      setJobs(newJobs);
      if (!newJobs.length) toast({ title: "No titles found in that file", description: "Double-check it's the right export file.", variant: "destructive" });
    } catch {
      toast({ title: "Could not read that file", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const startImport = async () => {
    setImporting(true);
    setSummary(null);
    const total = jobs.reduce((sum, j) => sum + j.entries.length, 0);
    setProgress({ done: 0, total });
    let imported = 0;
    let errors = 0;
    const noMatch: string[] = [];

    for (const job of jobs) {
      for (let i = 0; i < job.entries.length; i += BATCH_SIZE) {
        const batch = job.entries.slice(i, i + BATCH_SIZE);
        try {
          const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: job.type, entries: batch }) });
          const data = await res.json();
          if (res.ok && Array.isArray(data.results)) {
            for (const r of data.results) {
              if (r.status === "imported") imported++;
              else if (r.status === "no-match") noMatch.push(r.title);
              else errors++;
            }
          } else {
            errors += batch.length;
            if (data.error) {
              toast({ title: "Import stopped", description: data.error, variant: "destructive" });
              setImporting(false);
              return;
            }
          }
        } catch {
          errors += batch.length;
        }
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }
    }

    setImporting(false);
    setJobs([]);
    setFileName("");
    setSummary({ imported, noMatch, errors });
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: `Imported ${imported} title${imported === 1 ? "" : "s"}!` });
  };

  const busy = parsing || importing;

  return (
    <Card>
      <CardContent className="p-5 sm:p-7 space-y-6">
        <div>
          <h2 className="font-bold text-lg">Import your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">Bring in titles you've already tracked elsewhere. Each title is matched against the same sources Discover uses, so unmatched ones can be added by hand afterward.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              disabled={busy}
              onClick={() => { setFormat(f.key); setJobs([]); setSummary(null); setFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className={`rounded-lg border p-3 text-left text-sm transition disabled:opacity-50 ${format === f.key ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
            >
              <p className="font-semibold">{f.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
            </button>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Where to get this file: <b className="text-foreground">{activeFormat.source}</b>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={activeFormat.accept}
            disabled={busy}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-semibold hover:file:bg-accent"
          />
          {parsing && <span className="text-sm text-muted-foreground">Reading {fileName}…</span>}
        </div>

        {jobs.length > 0 && !importing && (
          <div className="rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">Found <b>{jobs.map((j) => j.label).join(", ")}</b> in {fileName}.</p>
            <Button size="sm" onClick={startImport}>Start import</Button>
          </div>
        )}

        {importing && (
          <div className="space-y-2">
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            <p className="text-xs text-muted-foreground">Importing {progress.done}/{progress.total}…</p>
          </div>
        )}

        {summary && (
          <div className="rounded-lg border px-4 py-3 space-y-2">
            <p className="text-sm font-semibold">
              Imported {summary.imported}
              {summary.noMatch.length > 0 && ` · ${summary.noMatch.length} not matched`}
              {summary.errors > 0 && ` · ${summary.errors} failed`}
            </p>
            {summary.noMatch.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Not matched — add these manually from Discover if you want them:</p>
                <p className="mt-1 text-xs">{summary.noMatch.slice(0, 25).join(" · ")}{summary.noMatch.length > 25 ? ` · +${summary.noMatch.length - 25} more` : ""}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
