/**
 * Tiny CSV parser tuned for Trading 212 exports. Handles:
 *   - Quoted fields with commas inside
 *   - Escaped double quotes ("")
 *   - Comma OR semicolon delimiter (T212 NL exports use comma)
 *   - Trailing CR/LF
 *
 * Returns an array of row objects keyed by the header row.
 */

export type CsvRow = Record<string, string>;

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === ',') counts[',']++;
    else if (ch === ';') counts[';']++;
    else if (ch === '\t') counts['\t']++;
  }
  if (counts[';'] > counts[',']) return ';';
  if (counts['\t'] > counts[',']) return '\t';
  return ',';
}

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === delim) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): CsvRow[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/^﻿/, '');
  const lines = cleaned.split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const delim = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delim);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], delim);
    if (cols.every((c) => c === '')) continue;
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cols[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

/** Normalise a header name for case-insensitive lookups. */
export function pick(row: CsvRow, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const target = candidate.toLowerCase();
    const match = keys.find((k) => k.toLowerCase() === target);
    if (match) return row[match];
  }
  return undefined;
}
