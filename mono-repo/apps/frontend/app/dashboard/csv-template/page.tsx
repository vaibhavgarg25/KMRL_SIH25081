"use client"

import React, { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  CloudUpload,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react"
import {
  FaFileCsv,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCloudUploadAlt,
  FaDownload,
} from "react-icons/fa"

/* -------------------------
   Types
   ------------------------- */
type ValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missing?: string[]
  extra?: string[]
}

/* -------------------------
   Helpers & Constants
   ------------------------- */
const normalizeHeader = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

/**
 * Lightweight CSV parser that supports:
 * - quoted fields (with double quote escaping)
 * - commas inside quotes
 * - CRLF or LF line endings
 *
 * Returns array of rows (array of strings).
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = text.length
  let row: string[] = []
  let cur = ""
  let inQuotes = false

  while (i < len) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        // lookahead for escaped double quote
        if (i + 1 < len && text[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        // closing quote
        inQuotes = false
        i++
        continue
      }
      // normal character inside quotes
      cur += ch
      i++
      continue
    }

    // not in quotes
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }

    if (ch === ",") {
      row.push(cur)
      cur = ""
      i++
      continue
    }

    // handle CRLF / LF / CR
    if (ch === "\r") {
      // check for \r\n
      row.push(cur)
      cur = ""
      rows.push(row)
      row = []
      if (i + 1 < len && text[i + 1] === "\n") i += 2
      else i++
      continue
    }

    if (ch === "\n") {
      row.push(cur)
      cur = ""
      rows.push(row)
      row = []
      i++
      continue
    }

    cur += ch
    i++
  }

  // push remaining
  if (inQuotes) {
    // Unterminated quotes — still push what we have
    row.push(cur)
    rows.push(row)
  } else {
    if (cur !== "" || row.length > 0) {
      row.push(cur)
      rows.push(row)
    }
  }

  return rows
}

const REQUIRED_HEADERS = ["trainid", "trainname"]
const KNOWN_OPTIONAL = new Set(
  [
    "rollingstockfitnessstatus",
    "signallingfitnessstatus",
    "telecomfitnessstatus",
    "rollingstockfitnessexpirydate",
    "signallingfitnessexpirydate",
    "telecomfitnessexpirydate",
    "jobcardstatus",
    "openjobcards",
    "closedjobcards",
    "lastjobcardupdate",
    "brandingactive",
    "brandcampaignid",
    "exposurehoursaccrued",
    "exposurehourstarget",
    "exposuredailyquota",
    "totalmileagekm",
    "mileagesincelastservicekm",
    "mileagebalancevariance",
    "brakepadwearpercent",
    "hvacwearpercent",
    "cleaningrequired",
    "cleaningslotstatus",
    "bayoccupancyidc",
    "cleaningcrewassigned",
    "lastcleaneddate",
    "baypositionid",
    "shuntingmovesrequired",
    "stablingsequenceorder",
    "operationalstatus",
    "reasonforstatus",
  ].map((s) => s.toLowerCase())
)

const TEMPLATE_HEADERS = [
  "trainID",
  "trainname",
  "rollingStockFitnessStatus",
  "signallingFitnessStatus",
  "telecomFitnessStatus",
  "fitnessExpiryDate",
  "openJobCards",
  "totalMileageKM",
  "brakepadWearPercent",
  "hvacWearPercent",
  "cleaningRequired",
  "bayPositionID",
  "operationalStatus",
]

/* -------------------------
   Small presentational PreviewTable (inline)
   ------------------------- */
function PreviewTable({
  headers,
  rows,
  maxVisible = 6,
}: {
  headers?: string[] | null
  rows?: string[][] | null
  maxVisible?: number
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">👀 Preview</div>
          <div className="text-xs text-muted-foreground">No rows to display</div>
        </div>
        <p className="mt-2 text-sm">Upload a CSV to see a preview here.</p>
      </div>
    )
  }

  const visible = rows.slice(0, maxVisible)

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div>
          <div className="text-xs text-muted-foreground">👀 Preview</div>
          <div className="text-sm font-medium">
            Showing {Math.min(rows.length, maxVisible)} of {rows.length} rows • {rows[0]?.length ?? 0} columns
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Tip: values truncated for display</div>
      </div>

      <div className="overflow-auto max-h-64">
        <table className="min-w-full table-auto text-sm">
          <caption className="sr-only">Data preview table</caption>
          {headers && (
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h || `Column ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-transparent" : "bg-muted/30"}>
                {row.map((cell, j) => (
                  <td key={j} className="max-w-[260px] px-3 py-2 align-top text-sm" title={cell ?? ""}>
                    <div className="truncate text-[0.92rem] leading-snug">{cell ?? "—"}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border">
        <div>Preview limited to first {maxVisible} rows</div>
        <div className="hidden sm:block">Download to open full data in Sheets / Excel</div>
      </div>
    </div>
  )
}

/* -------------------------
   Main component
   ------------------------- */
export default function CSVTemplatePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null)
  const [previewHeaders, setPreviewHeaders] = useState<string[] | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)

  /* -------------------------
     Download template
     ------------------------- */
  const downloadTemplate = () => {
    const sampleRow = [
      "TRAIN001",
      "Metro Train 1",
      "true",
      "true",
      "true",
      "2025-12-31",
      "0",
      "15000",
      "12",
      "10",
      "false",
      "A1",
      "in_service",
    ]
    const csv = [TEMPLATE_HEADERS.join(","), sampleRow.join(",")].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "trainset_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  /* -------------------------
     Validation & Preview
     ------------------------- */
  const validateAndPreview = (text: string): ValidationResult => {
    // parse with robust parser
    const rows = parseCSV(text).filter((r) => r.length > 0 && r.some((c) => c !== ""))

    if (rows.length === 0) {
      const result = {
        isValid: false,
        errors: ["❌ File is empty."],
        warnings: [],
        missing: REQUIRED_HEADERS,
        extra: [],
      }
      setValidation(result)
      setPreviewRows(null)
      setPreviewHeaders(null)
      return result
    }

    const headers = rows[0].map((h) => h.trim())
    const normalized = headers.map(normalizeHeader)

    const missing = REQUIRED_HEADERS.filter((r) => !normalized.includes(r))
    const extra = normalized.filter(
      (n) => !REQUIRED_HEADERS.includes(n) && !KNOWN_OPTIONAL.has(n)
    )

    const errors: string[] = []
    const warnings: string[] = []

    if (missing.length) errors.push(`Missing required: ${missing.join(", ")}`)
    //if (extra.length) warnings.push(`Unrecognized columns (will be ignored): ${extra.join(", ")}`)

    // Prepare preview rows (slice first 6 data rows)
    const dataRows = rows.slice(1)
    const previews = dataRows.slice(0, 6).map((r) => r.map((c) => c ?? ""))

    setPreviewRows(previews.length ? previews : null)
    setPreviewHeaders(headers)

    const result: ValidationResult = {
      isValid: missing.length === 0,
      errors,
      warnings,
      missing,
      extra,
    }
    setValidation(result)
    return result
  }

  const resetFileUI = () => {
    setFile(null)
    setValidation(null)
    setPreviewRows(null)
    setPreviewHeaders(null)
    setShowConfirm(false)
    setConfirmChecked(false)
    setSendError(null)
    setSendSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    resetFileUI()
    if (!f) return
    setFile(f)

    if (!f.name.toLowerCase().endsWith(".csv")) {
      const v: ValidationResult = { isValid: false, errors: ["❌ Please upload a .csv file."], warnings: [], missing: [], extra: [] }
      setValidation(v)
      return
    }

    try {
      const text = await f.text()
      validateAndPreview(text)
    } catch (err: any) {
      setValidation({ isValid: false, errors: ["❌ Failed to read file."], warnings: [], missing: [], extra: [] })
    }
  }

  const openFileBrowser = () => fileInputRef.current?.click()

  /* -------------------------
     Confirm modal actions
     ------------------------- */
  const handleOpenConfirm = () => {
    if (!file || !validation?.isValid) return
    setShowConfirm(true)
    setConfirmChecked(false)
  }

  const handleCancelConfirm = () => {
    setShowConfirm(false)
    setConfirmChecked(false)
  }

  const handleSend = async () => {
    if (!file || !validation?.isValid || !confirmChecked) return
    setIsSending(true)
    setSendError(null)
    setSendSuccess(false)
    try {
      const form = new FormData()
      form.append("file", file)
      const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:8000"
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const res = await fetch(`${baseUrl}/api/upload/upload`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Upload failed")
      }
      setSendSuccess(true)
      // clear local UI after short delay (keeps success message visible)
      setTimeout(() => {
        resetFileUI()
      }, 1200)
    } catch (err: any) {
      setSendError(err?.message || "Upload failed")
    } finally {
      setIsSending(false)
    }
  }

  /* -------------------------
     Render
     ------------------------- */
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-2">
          <FaFileCsv className="text-green-500" /> Data Upload
        </h1>
        <p className="text-muted-foreground">
          📝 Step 1: Download → ✍️ Edit → 📤 Upload → ✅ Confirm
        </p>
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Download */}
        <Card className="glass-card p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FaDownload className="text-accent" /> Download Template
            </CardTitle>
            <CardDescription>📂 Includes headers + 1 sample row</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_HEADERS.slice(0, 5).map((h) => (
                <Badge key={h} variant="secondary">
                  {h}
                </Badge>
              ))}
              <Badge variant="outline">+{TEMPLATE_HEADERS.length - 5} more</Badge>
            </div>
            <Button onClick={downloadTemplate} className="w-full bg-accent text-accent-foreground">
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card className="glass-card p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FaCloudUploadAlt className="text-blue-500" /> Upload CSV
            </CardTitle>
            <CardDescription>📤 Validate instantly before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex gap-2">
              <Button onClick={openFileBrowser} variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" /> Choose File
              </Button>
              <Button
                onClick={() => {
                  if (file) {
                    // quick download of the uploaded file for inspection
                    const url = URL.createObjectURL(file)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = file.name
                    a.click()
                    URL.revokeObjectURL(url)
                  } else {
                    downloadTemplate()
                  }
                }}
                variant="ghost"
                className="w-36"
                title={file ? "Download uploaded file" : "Download template"}
              >
                <FaDownload className="mr-2" />
                {file ? "Save" : "Template"}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {file ? <span className="text-foreground">📄 {file.name}</span> : "No file selected"}
            </div>

            {/* Validation status */}
            {validation && (
              <div>
                {validation.isValid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <FaCheckCircle /> Headers OK — Ready to upload
                  </div>
                ) : (
                  <div className="text-red-600 flex gap-2 items-start">
                    <XCircle className="mt-0.5" /> <span>{validation.errors.join(", ")}</span>
                  </div>
                )}
                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="text-yellow-600 flex gap-2 items-start mt-2">
                    <FaExclamationTriangle className="mt-0.5" />
                    <span>{validation.warnings.join(", ")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <div>
              <PreviewTable headers={previewHeaders ?? undefined} rows={previewRows ?? undefined} />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleOpenConfirm}
                disabled={!validation?.isValid}
                className="flex-1 bg-primary text-primary-foreground"
              >
                🚀 Upload & Confirm
              </Button>
              <Button
                onClick={resetFileUI}
                variant="outline"
                className="w-28"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancelConfirm} />
          <div className="relative max-w-lg w-full p-6 rounded-2xl glass-card border border-border">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="text-blue-500" /> Confirm Upload
            </h3>
            <p className="mt-2 text-muted-foreground text-sm">
              📄 File: <span className="font-medium">{file?.name}</span>
            </p>
            <p className="text-muted-foreground text-sm">This will update trainset records in the database.</p>

            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="h-4 w-4"
                aria-label="Confirm file correctness"
              />
              <span className="text-sm">✅ I confirm this file is correct.</span>
            </label>

           <div className="flex gap-2 mt-4">
  <Button
    onClick={handleSend}
    disabled={!confirmChecked || isSending}
    className="flex-1 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
  >
    {isSending ? "⏳ Sending..." : "📤 Send to Database"}
  </Button>

  <Button
    onClick={handleCancelConfirm}
    className="bg-red-500 text-white hover:from-red-500 hover:to-red-600 
               dark:bg-red-600 dark:hover:from-red-600 dark:hover:to-red-700
               hover:bg-gradient-to-r transition-colors"
  >
    Cancel
  </Button>
</div>


            {sendError && <div className="mt-2 text-red-600 text-sm">❌ {sendError}</div>}
            {sendSuccess && <div className="mt-2 text-green-600 text-sm">🎉 Success! File processed.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
