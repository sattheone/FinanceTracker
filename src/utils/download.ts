export async function downloadElementPng(element: HTMLElement, fileName: string, width: number, height: number) {
  if (!element) return;
  const clone = element.cloneNode(true) as HTMLElement;
  // Ensure width/height to avoid clipping
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  // Wrap in XHTML container for foreignObject
  const xhtml = `<div xmlns='http://www.w3.org/1999/xhtml' style='width:${width}px;height:${height}px;'>${clone.outerHTML}</div>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <foreignObject x='0' y='0' width='100%' height='100%'>${xhtml}</foreignObject>
  </svg>`;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      // Set background to match card (dark)
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = fileName;
  a.click();
}
