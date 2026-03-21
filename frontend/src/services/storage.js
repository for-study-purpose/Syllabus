/** Returns the Google Drive view URL for a stored file. */
export function getViewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
}
