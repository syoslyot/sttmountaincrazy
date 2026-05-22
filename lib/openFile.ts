export async function openFile(
  filePath: string,
  filename: string,
  bucket: 'records' | 'maps',
): Promise<void> {
  const url = `/api/file?bucket=${bucket}&path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(filename)}`
  const res = await fetch(url)
  if (!res.ok) { console.error('openFile failed', res.status); return }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)

  if (/\.pdf$/i.test(filename)) {
    window.open(objectUrl, '_blank')
  } else {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
}
