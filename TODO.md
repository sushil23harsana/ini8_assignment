# TODO.md

## Current TODOs and Ideas

### High Priority
- [ ] Fix that weird PDF viewer zoom issue on mobile Safari
- [ ] Add proper loading states everywhere (users get confused)
- [ ] Better error handling for network failures
- [ ] Test with really large PDF files (what happens at 50MB?)

### Nice to Have
- [ ] Dark mode (everyone wants this now)
- [ ] Bulk upload functionality
- [ ] Document search/filtering
- [ ] Tags or categories for documents
- [ ] Export analysis results as text file
- [ ] Email sharing of documents

### Technical Debt
- [ ] Refactor the DocumentItem component (it's getting big)
- [ ] Add proper TypeScript interfaces everywhere
- [ ] Set up proper logging in production
- [ ] Add database migrations for future schema changes
- [ ] Consider moving to cloud storage instead of local files

### Bugs to Fix
- [ ] Sometimes the analysis modal doesn't close properly on mobile
- [ ] File size formatting could be better (shows weird decimals)
- [ ] Date formatting is inconsistent across components

### Performance
- [ ] Add pagination for document list (what if someone uploads 1000 files?)
- [ ] Lazy load PDF previews
- [ ] Consider using React.memo for document items
- [ ] Bundle size optimization

### Security/Production
- [ ] Add rate limiting to API endpoints  
- [ ] Better file validation (check actual PDF structure)
- [ ] Add user authentication (currently anyone can access)
- [ ] HTTPS setup guide
- [ ] Database backup strategy

### Random Ideas
- [ ] Integration with Google Drive/Dropbox
- [ ] OCR for scanned documents
- [ ] AI-powered document categorization
- [ ] Generate summaries for long documents
- [ ] Document version history