# Development Notes

## Issues I ran into while building this

### PDF Viewer
- react-pdf was being weird with the worker setup. Had to try like 3 different CDN URLs before finding one that worked consistently
- The pagination controls were finicky - kept getting off-by-one errors
- Mobile responsiveness took way longer than expected

### AI Integration  
- Started with Gemini but switched to Mistral for better EU compliance
- The prompt engineering took forever. First attempts were giving super generic responses
- Had to adjust the context length limits - some medical PDFs are really long

### Backend Stuff
- PostgreSQL setup was straightforward but the connection kept dropping in development
- File upload validation - learned you can't just trust the file extension
- CORS issues drove me crazy for like 2 hours before I remembered to add the headers properly

### CSS Battles
- The document grid layout broke on smaller screens initially
- Button icons kept getting misaligned (still not 100% happy with them)
- Modal z-index conflicts with other components

## Things I'd improve with more time
- Add file compression for large PDFs
- Better error messages for users
- Drag & drop upload area
- Search functionality across documents
- Better mobile UI for the PDF viewer
- Maybe add OCR for scanned documents

## Random observations
- Mistral's API is actually pretty fast compared to others I've tried
- TypeScript caught SO many bugs during development
- The Django admin interface is still magical
- Users will definitely try to upload non-PDF files despite the warnings