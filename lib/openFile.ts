export function openFile(filePath: string, filename: string, bucket: 'records' | 'maps'): void {
  const url = `/api/file/${encodeURIComponent(filename)}?bucket=${bucket}&path=${encodeURIComponent(filePath)}`
  window.open(url, '_blank')
}
