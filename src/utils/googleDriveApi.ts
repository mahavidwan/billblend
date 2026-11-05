const FILE_NAME = 'billblend_backup.json';
const BOUNDARY = '-------314159265358979323846';

// --- ROBUST ERROR HANDLING ENGINE ---
export async function handleApiResponse(res: Response) {
  if (!res.ok) {
    let errorMessage = `API Error: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error && errorData.error.message) {
        errorMessage = errorData.error.message;
      }
    } catch (e) { /* Ignore non-JSON responses */ }

    if (res.status === 401) {
      throw new Error("AUTH_EXPIRED"); 
    }
    throw new Error(`${errorMessage}`);
  }
  return res;
}

export async function findBackupFileId(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleApiResponse(res);
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

export async function downloadBackup(token: string, fileId: string): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleApiResponse(res);
  return await res.json();
}

export async function uploadBackup(token: string, data: any, existingFileId: string | null) {
  // 🚨 FIX: Google Drive rejects the 'parents' array on PATCH (update) requests.
  // We only attach 'parents' if existingFileId is null (meaning we are creating a POST request).
  const metadata: any = { name: FILE_NAME };
  if (!existingFileId) {
    metadata.parents = ['appDataFolder'];
  }

  const delimiter = `\r\n--${BOUNDARY}\r\n`;
  const closeDelimiter = `\r\n--${BOUNDARY}--`;
  const body = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(data) +
    closeDelimiter;

  const method = existingFileId ? 'PATCH' : 'POST';
  const url = existingFileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method,
    headers: { 
      Authorization: `Bearer ${token}`, 
      'Content-Type': `multipart/related; boundary=${BOUNDARY}` 
    },
    body
  });
  await handleApiResponse(res);
}