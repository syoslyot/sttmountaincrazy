// URL: /api/file/{bucket}/{...filePath}/{displayName}
// LibreOffice 取最後一段作為檔名，不含 query string
export function openFile(filePath: string, filename: string, bucket: 'records' | 'maps' | 'previews'): void {
  const url = `/api/file/${bucket}/${filePath}/${encodeURIComponent(filename)}`
  window.open(url, '_blank')
}
