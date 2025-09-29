"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageLoader } from "@/components/page-loader"
import {
  CheckCircle,
  XCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Database,
  FileCheck,
  Zap,
  
} from "lucide-react"
import { FaFileCsv, FaCheckCircle, FaExclamationTriangle, FaCloudUploadAlt, FaDownload } from "react-icons/fa"

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
  ].map((s) => s.toLowerCase()),
)

const TEMPLATE_HEADERS = [
  "Trainname",
  "TrainID",
  "CURRENT_DATE",
  "RollingStockFitnessStatus",
  "SignallingFitnessStatus",
  "TelecomFitnessStatus",
  "RollingStockFitnessExpiryDate",
  "SignallingFitnessExpiryDate",
  "TelecomFitnessExpiryDate",
  "JobCardStatus",
  "OpenJobCards",
  "ClosedJobCards",
  "LastJobCardUpdate",
  "BrandingActive",
  "BrandCampaignID",
  "ExposureHoursAccrued",
  "ExposureHoursTarget",
  "ExposureDailyQuota",
  "TotalMileageKM",
  "MileageSinceLastServiceKM",
  "MileageBalanceVariance",
  "BrakepadWear%",
  "HVACWear%",
  "CleaningRequired",
  "CleaningSlotStatus",
  "BayOccupancyIDC",
  "LastCleanedDate",
  "BayPositionID",
  "ShuntingMovesRequired",
  "StablingSequenceOrder",
  "OperationalStatus",
]

/* -------------------------
   Enhanced PreviewTable with loading states
   ------------------------- */
function PreviewTable({
  headers,
  rows,
  maxVisible = 6,
  isLoading = false,
}: {
  headers?: string[] | null
  rows?: string[][] | null
  maxVisible?: number
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="glass-card border border-border/50 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" variant="teal" />
            <div className="text-sm font-medium">Processing CSV...</div>
          </div>
          <div className="text-xs text-muted-foreground">Please wait</div>
        </div>
        <div className="p-8">
          <PageLoader variant="inline" message="Parsing and validating your CSV file..." />
        </div>
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="glass-card border border-border/50 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm font-medium">Preview</div>
          </div>
          <div className="text-xs text-muted-foreground">No data</div>
        </div>
        <div className="p-6 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Upload a CSV to see a preview here</p>
        </div>
      </div>
    )
  }

  const visible = rows.slice(0, maxVisible)

  return (
    <div className="glass-card border border-border/50 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-gradient-to-r from-background/50 to-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
          <div className="text-sm font-medium">Data Preview</div>
          <Badge variant="secondary" className="text-xs">
            {Math.min(rows.length, maxVisible)} of {rows.length}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">{rows[0]?.length ?? 0} columns</div>
      </div>

      <div className="overflow-auto max-h-80">
        <table className="min-w-full table-auto text-sm">
          <caption className="sr-only">Data preview table</caption>
          {headers && (
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-sm">
              <tr>
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80 border-r border-border/20 last:border-r-0"
                  >
                    {h || `Column ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody>
            {visible.map((row, i) => (
              <tr
                key={i}
                className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="max-w-[200px] px-4 py-3 align-top text-sm border-r border-border/10 last:border-r-0"
                    title={cell ?? ""}
                  >
                    <div className="truncate text-sm leading-relaxed font-mono">{cell ?? "—"}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t border-border/30 bg-gradient-to-r from-background/50 to-muted/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          Preview limited to first {maxVisible} rows
        </div>
        <div className="hidden sm:block">Download to view complete data</div>
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
  const [isProcessing, setIsProcessing] = useState(false)

  /* -------------------------
     Download template
     ------------------------- */
  const downloadTemplate = () => {
    const sampleRow = [
      "Krishna",
      "T01",
      "15-09-2025",
      "False",
      "True",
      "False",
      "12-08-2025",
      "01-03-2026",
      "10-07-2025",
      "open",
      "3",
      "7",
      "17-03-2023",
      "True",
      "KMM-RLJ-WRP-25-01",
      "288",
      "320",
      "16",
      "4759",
      "2339",
      "7661",
      "40",
      "59",
      "True",
      "booked",
      "BAY_08",
      "05-08-2023",
      "15",
      "0",
      "1",
      "Under_Maintenance",

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
  const validateAndPreview = async (text: string): Promise<ValidationResult> => {
    setIsProcessing(true)

    // Add artificial delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 800))

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
      setIsProcessing(false)
      return result
    }

    const headers = rows[0].map((h) => h.trim())
    const normalized = headers.map(normalizeHeader)

    const missing = REQUIRED_HEADERS.filter((r) => !normalized.includes(r))
    const extra = normalized.filter((n) => !REQUIRED_HEADERS.includes(n) && !KNOWN_OPTIONAL.has(n))

    const errors: string[] = []
    const warnings: string[] = []

    if (missing.length) errors.push(`Missing required: ${missing.join(", ")}`)

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
    setIsProcessing(false)
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
    setIsProcessing(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    resetFileUI()
    if (!f) return
    setFile(f)

    if (!f.name.toLowerCase().endsWith(".csv")) {
      const v: ValidationResult = {
        isValid: false,
        errors: ["❌ Please upload a .csv file."],
        warnings: [],
        missing: [],
        extra: [],
      }
      setValidation(v)
      return
    }

    try {
      const text = await f.text()
      await validateAndPreview(text)
    } catch (err: any) {
      setValidation({
        isValid: false,
        errors: ["❌ Failed to read file."],
        warnings: [],
        missing: [],
        extra: [],
      })
      setIsProcessing(false)
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 space-y-12">
        {/* Enhanced Header */}
        <div className="text-center space-y-6">
          

          <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
            Trainset Data Upload
          </h1>

          

          {/* Process indicators */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
              <Download className="w-3 h-3" />
              <span>Download</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
              <FileCheck className="w-3 h-3" />
              <span>Edit</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
              <Upload className="w-3 h-3" />
              <span>Upload</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 text-xs text-teal-600 dark:text-teal-400">
              <Database className="w-3 h-3" />
              <span>Confirm</span>
            </div>
          </div>
        </div>

        {/* Enhanced Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Download Card */}
          <Card className="glass-card border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500/20 to-teal-600/20">
                  <FaDownload className="text-teal-500" />
                </div>
                Template Download
              </CardTitle>
              <CardDescription className="text-base">
                Get started with our pre-configured CSV template including sample data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Included Headers:</div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_HEADERS.slice(0, 4).map((h) => (
                    <Badge key={h} variant="secondary" className="text-xs font-mono">
                      {h}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-xs">
                    +{TEMPLATE_HEADERS.length - 4} more
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  
                  What you get:
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Pre-formatted headers</li>
                  <li>• Sample data row</li>
                  <li>• Ready for Excel/Sheets</li>
                </ul>
              </div>

              <Button
                onClick={downloadTemplate}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          {/* Upload Card */}
          <Card className="glass-card border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20">
                  <FaCloudUploadAlt className="text-blue-500" />
                </div>
                CSV Upload & Validation
              </CardTitle>
              <CardDescription className="text-base">
                Upload your completed CSV for instant validation and preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

              <div className="flex gap-3">
                <Button
                  onClick={openFileBrowser}
                  variant="outline"
                  className="flex-1 border-dashed border-2 hover:border-teal-500/50 hover:bg-teal-500/5 transition-colors bg-transparent"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose CSV File
                </Button>
                <Button
                  onClick={() => {
                    if (file) {
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
                  className="px-6"
                  title={file ? "Download uploaded file" : "Download template"}
                >
                  <FaDownload className="mr-2" />
                  {file ? "Save" : "Template"}
                </Button>
              </div>

              {/* File status */}
              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Selected file:</span>
                  {file ? (
                    <span className="font-medium text-foreground">{file.name}</span>
                  ) : (
                    <span className="text-muted-foreground italic">No file selected</span>
                  )}
                </div>
              </div>

              {/* Enhanced Validation status */}
              {validation && (
                <div className="space-y-3">
                  {validation.isValid ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="p-1 rounded-full bg-green-500/20">
                        <FaCheckCircle className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="font-medium text-green-700 dark:text-green-300">Validation Passed</div>
                        <div className="text-sm text-green-600 dark:text-green-400">
                          Headers validated — Ready to upload
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="p-1 rounded-full bg-red-500/20 mt-0.5">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="font-medium text-red-700 dark:text-red-300">Validation Failed</div>
                        <div className="text-sm text-red-600 dark:text-red-400">{validation.errors.join(", ")}</div>
                      </div>
                    </div>
                  )}

                  {validation.warnings && validation.warnings.length > 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="p-1 rounded-full bg-yellow-500/20 mt-0.5">
                        <FaExclamationTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <div className="font-medium text-yellow-700 dark:text-yellow-300">Warnings</div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          {validation.warnings.join(", ")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleOpenConfirm}
                  disabled={!validation?.isValid || isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Confirm
                    </>
                  )}
                </Button>
                <Button onClick={resetFileUI} variant="outline" className="px-6 bg-transparent" disabled={isProcessing}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Preview Section */}
        <div className="max-w-7xl mx-auto">
          <PreviewTable
            headers={previewHeaders ?? undefined}
            rows={previewRows ?? undefined}
            isLoading={isProcessing}
          />
        </div>

        {/* Enhanced Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={isSending ? undefined : handleCancelConfirm}
            />
            <div className="relative max-w-lg w-full mx-4">
              <div className="glass-card border border-border/50 shadow-2xl p-6 space-y-6">
                {/* Loading overlay */}
                {isSending && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="glass-card p-6 text-center space-y-4 border border-border/50">
                      <div className="relative mx-auto">
                        <LoadingSpinner size="xl" variant="teal" />
                        <div className="absolute inset-0 animate-ping">
                          <LoadingSpinner size="xl" variant="teal" className="opacity-20" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium">Uploading to Database</div>
                        <div className="text-sm text-muted-foreground">Please wait while we process your file...</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-teal-500/20 to-blue-500/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-teal-500" />
                  </div>
                  <h3 className="text-2xl font-bold">Confirm Upload</h3>
                  <p className="text-muted-foreground">Ready to update your trainset database</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{file?.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      This will update trainset records in the database
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-teal-500 focus:ring-teal-500"
                      aria-label="Confirm file correctness"
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium">I confirm this file is correct</div>
                      <div className="text-xs text-muted-foreground">
                        Please verify your data before proceeding with the upload
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSend}
                    disabled={!confirmChecked || isSending}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                    size="lg"
                  >
                    {isSending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Uploading...
                      </span>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Send to Database
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleCancelConfirm}
                    disabled={isSending}
                    variant="outline"
                    className="px-6 bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>

                {/* Status messages */}
                {sendError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">{sendError}</span>
                  </div>
                )}
                {sendSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Success! File processed successfully.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
