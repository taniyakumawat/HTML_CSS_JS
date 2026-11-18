import apiClient from '../api/client.js';

/**
 * Authenticated file download: fetches the file as a blob with the JWT header,
 * then triggers a browser save using the server's Content-Disposition filename
 * (falls back to `fallbackName`).
 * Returns the downloaded filename.
 */
export async function downloadFile(path, params = {}, fallbackName = 'download') {
  const res = await apiClient.get(path, { params, responseType: 'blob' });
  const disposition = res.headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = match?.[1] || fallbackName;

  const url = URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}

/** Best-effort human message from an axios error (including blob errors). */
export const downloadErrorMessage = (err, fallback = 'Download failed') =>
  err?.response?.data?.message || err?.message || fallback;
