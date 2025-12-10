import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

declare module 'react-pdf' {
  export interface DocumentProps {
    file: string | File | Uint8Array;
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: any) => void;
    loading?: React.ReactNode;
    children?: React.ReactNode;
  }
  
  export interface PageProps {
    pageNumber: number;
    scale?: number;
    renderTextLayer?: boolean;
    renderAnnotationLayer?: boolean;
  }
  
  export const Document: React.ComponentType<DocumentProps>;
  export const Page: React.ComponentType<PageProps>;
  export const pdfjs: {
    version: string;
    GlobalWorkerOptions: {
      workerSrc: string;
    };
  };
}