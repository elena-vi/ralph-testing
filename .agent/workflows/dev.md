---
description: Start development servers and add new features
---

## Start Development

// turbo
1. Start both client and server concurrently:
```bash
npm run dev
```

Client runs on http://localhost:3000, server on http://localhost:8080.

## Start Servers Separately

// turbo
2. Start Express server with hot reload:
```bash
npm run server
```

// turbo
3. Start Vite dev server:
```bash
npm run client
```

## Add a New Feature (Full Stack)

4. **Server route**: Create `src/server/routes/v1/<resource>.route.js`
5. **Server service**: Create `src/server/services/<resource>.service.js`
6. **Register route**: Import and mount in `src/server/routes/v1/index.js`
7. **Client service**: Add methods in `src/client/services/<resource>.js`, export from `src/client/services/index.js`
8. **Client hook**: Create `src/client/hooks/use<Resource>.js`, export from `src/client/hooks/index.js`
9. **Client page**: Create `src/client/pages/<Resource>.jsx`
10. **Add route**: Register page route in `src/client/index.jsx`
11. **Add nav link**: Add navigation button in `src/client/components/Header.jsx`
