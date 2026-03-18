
import * as pdfjsLib from 'pdfjs-dist';
import { PageData } from '../types';

// Set worker source using a reliable CDN URL that matches the package version
const PDFJS_VERSION = '5.5.207';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export const loadPdfPages = async (file: File): Promise<PageData[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Added cMapUrl and cMapPacked for better support of international characters (like Korean)
    // Also added standardFontsUrl for better font rendering
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
      cMapPacked: true,
    } as any).promise;
    
    const numPages = pdf.numPages;
    if (numPages === 0) throw new Error('The PDF file has no pages.');

    const pages: PageData[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      // Reduced scale from 5.0 to 2.0 to prevent memory issues and "Canvas area exceeds limit" errors
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await (page as any).render({
          canvasContext: context,
          viewport: viewport,
          intent: 'print',
          background: 'white'
        }).promise;

        const imageUrl = canvas.toDataURL('image/png');
        const textContent = await page.getTextContent();
        
        const text = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');

        pages.push({ imageUrl, text });
      }
    }

    return pages;
  } catch (error) {
    console.error('Error in loadPdfPages:', error);
    if (error instanceof Error) {
      if (error.message.includes('Worker')) {
        throw new Error('PDF Worker failed to load. Please check your internet connection.');
      }
    }
    throw error;
  }
};
