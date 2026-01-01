import { toPng } from 'html-to-image';

export async function downloadElementPng(element: HTMLElement, fileName: string, width: number, height: number) {
  if (!element) return;
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: '#111827',
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      pixelRatio: 2,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  } catch (err) {
    console.error('Download failed', err);
    alert('Unable to download image. Try a different browser or disable strict cross-origin settings.');
  }
}
