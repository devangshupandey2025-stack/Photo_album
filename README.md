# 📸 Lumina — Modern Media Vault

A **fully functional**, premium photo & video gallery app built with React + Vite + TailwindCSS. Everything runs **100% in your browser** — no backend, no API keys, no sign-ups.

---

## 🤔 WTF is this?

Lumina is a local-first media vault that lets you:

- **Upload** real photos/videos from your device (drag & drop or file picker)
- **Browse** them in a beautiful dark-mode gallery
- **Organize** media into albums you create
- **Search, sort, & filter** your library
- **Lock** private media behind a PIN-protected Secure Vault
- **Download** any media file
- **Share** links (or copy to clipboard on desktop)
- **View** media in a full-screen lightbox with keyboard navigation

**All data lives in your browser's `localStorage`.** Nothing leaves your machine. Close the tab and your stuff is still there when you come back.

---

## 🏗️ Architecture — How It All Works

```
Photo_album/
├── index.html              ← Entry point (loads React)
├── vite.config.ts          ← Vite + TailwindCSS + SingleFile plugin
├── package.json            ← Dependencies
├── src/
│   ├── main.tsx            ← React root mount
│   ├── App.tsx             ← 🧠 Main app logic (state, routing, wiring)
│   ├── index.css           ← Global styles + Tailwind imports
│   ├── types.ts            ← TypeScript interfaces (MediaItem, Album, etc.)
│   ├── mockData.ts         ← Demo data (Unsplash images) loaded on first run
│   ├── components/
│   │   ├── Sidebar.tsx     ← Navigation sidebar with tabs & actions
│   │   ├── MediaCard.tsx   ← Individual photo/video thumbnail card
│   │   ├── MediaViewer.tsx ← Full-screen lightbox with controls
│   │   ├── AlbumCard.tsx   ← Album cover card
│   │   ├── SecureVault.tsx ← PIN unlock screen for locked media
│   │   ├── UploadModal.tsx ← Drag-and-drop upload dialog
│   │   └── CreateAlbumModal.tsx ← Album creation dialog
│   ├── hooks/
│   │   └── useLocalStorage.ts  ← Persistent state in localStorage
│   └── utils/
│       ├── cn.ts           ← Tailwind class merger (clsx + twMerge)
│       └── fileHelpers.ts  ← File utilities (upload, download, share, etc.)
```

### Data Flow

```
User uploads file
    → UploadModal reads file as Data URL (base64)
    → Creates MediaItem object with metadata
    → Saves to localStorage via useLocalStorage hook
    → App.tsx re-renders gallery with new item

User clicks photo
    → MediaViewer opens as fullscreen overlay
    → Arrow keys / buttons navigate prev/next
    → Download/Share/Favorite/Lock/Delete all work
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ installed
- **npm** (comes with Node)

### Run it

```bash
# 1. Install dependencies
cd Photo_album
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
#    → http://localhost:5173
```

### Build for production

```bash
npm run build
# Output: dist/index.html (single file, self-contained)
```

The `vite-plugin-singlefile` bundles everything into one HTML file you can share or host anywhere.

---

## 🎯 Features Cheat Sheet

| Feature | How to use it |
|---|---|
| **Upload photos/videos** | Click **"Upload New"** button (bottom of sidebar), drag-drop or pick files |
| **View full-screen** | Click any photo → opens lightbox |
| **Navigate photos** | `←` `→` arrow keys, or click side arrows |
| **Fullscreen mode** | Press `F` key or click "Fullscreen" button |
| **Close viewer** | Press `Esc` or click `X` |
| **Favorite** | Click heart icon on hover or in viewer |
| **Download** | Click download icon in viewer toolbar |
| **Share / Copy link** | Click share icon in viewer toolbar |
| **Delete** | Click trash icon in viewer (with confirmation) |
| **Lock to vault** | Click lock icon in viewer → moves to Secure Vault |
| **Secure Vault** | Click "Secure Vault" in sidebar → PIN is `1234` |
| **Create album** | Click **"Album"** button (bottom of sidebar) |
| **Delete album** | Hover album card → click trash icon (top-left) |
| **Search** | Type in search bar (top right) |
| **Sort** | Click sort icon → pick Newest/Oldest/Name/Size |
| **Filter** | Click filter icon → All/Images/Videos |
| **Grid size** | Toggle between compact/large grid (top right icons) |
| **Clear all data** | Click **"Clear"** button (bottom of sidebar) |

---

## 🔐 Secure Vault

The "Secure Vault" tab locks selected media behind a PIN screen.

- **Default PIN:** `1234`
- Media in the vault is blurred in other views
- Lock/unlock individual items from the lightbox viewer

> ⚠️ The PIN is hardcoded for demo purposes. In a real app you'd hash it and store securely.

---

## 💾 Storage Notes

- All media is stored as **base64 Data URLs** in `localStorage`
- `localStorage` has a ~5-10 MB limit in most browsers
- For heavy use, you'd want to swap to IndexedDB (not implemented yet)
- Click **"Clear"** in the sidebar to wipe all data and start fresh
- The app ships with demo Unsplash images — these are URLs (not stored locally)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **TailwindCSS 4** | Styling |
| **TypeScript** | Type safety |
| **Framer Motion** | Animations & transitions |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting |
| **vite-plugin-singlefile** | Single-file production build |

---

## 📝 What's NOT included (yet)

- Backend / cloud storage (everything is browser-local)
- User authentication
- IndexedDB for larger storage
- Image editing / cropping
- Mobile responsive sidebar (currently desktop-first)

---

## 🐛 Troubleshooting

**Broken demo images?**
The demo data uses Unsplash URLs. If you're offline or Unsplash is down, images won't load. Click **"Clear"** and upload your own files.

**Storage full?**
`localStorage` maxes out at ~5-10MB. Upload smaller files or clear old ones.

**App looks empty / wrong data?**
The app caches data in `localStorage`. Clear it from browser DevTools → Application → Local Storage → delete `lumina-media` and `lumina-albums` keys, then refresh.

---

Built with ☕ and questionable amounts of CSS.
