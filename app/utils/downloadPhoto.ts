function forceDownload(blobUrl: string, filename: string) {
    let a: any = document.createElement('a')
    a.download = filename
    a.href = blobUrl
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  
  export default function downloadPhoto(url: string, filename: string) {
    if (!url) {
      console.error('No URL provided for download');
      return;
    }

    // Extract original filename if none provided
    if (!filename) {
      const urlParts = url.split(/[#?]/)[0].split('/');
      filename = urlParts.pop() || 'photo.jpg';
    }

    // Ensure filename has an extension
    if (!filename.includes('.')) {
      filename += '.jpg';
    }

    // Add timestamp to filename to prevent overwrites
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const finalFilename = `${filename.replace(/\.[^/.]+$/, '')}_${timestamp}${filename.match(/\.[^/.]+$/)?.[0] || '.jpg'}`;

    fetch(url, {
      headers: new Headers({
        Origin: location.origin,
      }),
      mode: 'cors',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        let blobUrl = window.URL.createObjectURL(blob)
        forceDownload(blobUrl, finalFilename)
        // Cleanup
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      })
      .catch((e) => {
        console.error('Error downloading photo:', e);
        alert('Failed to download photo. Please try again.');
      })
  }