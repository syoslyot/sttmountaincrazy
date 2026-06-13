// URL: /api/file/{bucket}/{...filePath}/{displayName}
// LibreOffice 取最後一段作為檔名，不含 query string
export function openFile(filePath: string, filename: string, bucket: 'records' | 'maps' | 'previews'): void {
  // encode per segment so '#', '?', '%' or spaces in stored paths stay routable
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const url = `/api/file/${bucket}/${encodedPath}/${encodeURIComponent(filename)}`
  window.open(url, '_blank')
}
