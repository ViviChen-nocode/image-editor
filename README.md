<div align="center">
  <img src="./banner.png" alt="圖片編輯器 Banner" width="1200" />
  
  # 📸 圖片編輯器
  
  <p>這是一款易用圖片編輯工具，包含自由裁切、調整成常見社群或自訂尺寸，下載也可指定檔案大小喔</p>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)](https://vitejs.dev/)
</div>

---

## ✨ 功能特色

### 圖片編輯器
- 🎨 **自由裁切** - 支援自由比例或固定比例（正方形、16:9、4:3）裁切
- 📐 **尺寸調整** - 內建多種社群媒體尺寸預設（Facebook、Instagram、Threads）
- 🎯 **自訂尺寸** - 可自訂畫布尺寸並儲存為常用預設
- 🖼️ **物件控制** - 支援拖曳移動、縮放、三種適應模式（包含、填滿、拉伸）
- 🎨 **畫布設定** - 可調整畫布底色（白色、黑色、透明、自訂顏色）
- 💾 **檔案大小控制** - 下載時可指定檔案大小限制，自動壓縮品質
- 🔄 **重新裁切** - 編輯過程中可隨時重新裁切圖片
- ↩️ **復原功能** - 支援操作歷史復原

### 拼圖工具 (v2.0.0 新增)
- 🎭 **多種版型** - 內建 5 種拼圖版型（單張、左右對分、上下對分、三格、四格）
- 📐 **彈性尺寸** - 支援多種社群媒體尺寸預設，也可自訂尺寸
- 🖼️ **拖放上傳** - 直接從桌面拖放圖片到框格中
- 🎯 **框內調整** - 在框格內拖動調整圖片位置，滾輪縮放大小
- ✂️ **完整顯示** - 圖片完整顯示不被裁切，超出部分自動遮罩
- 💾 **一鍵匯出** - 合成多張圖片為一張，支援 JPG/PNG 格式

### 共同特色
- 🔒 **隱私保護** - 所有處理皆在本機完成，檔案不會上傳至雲端伺服器

## 🚀 快速開始

### 前置需求

- Node.js 18.0 或更高版本
- npm 或 yarn

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone https://github.com/ViviChen-nocode/image-editor.git
   cd image-editor
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

4. **開啟瀏覽器**
   訪問 `http://localhost:5173`（或終端顯示的網址）

### 建置生產版本

```bash
npm run build
```

建置完成後，檔案會輸出到 `dist/` 資料夾。

### 預覽生產版本

```bash
npm run preview
```

## 📖 使用說明

### 步驟 1：上傳圖片
- 拖曳圖片檔案到上傳區域，或點擊「選擇檔案」按鈕

### 步驟 2：裁切圖片
- 選擇裁切比例（自由、正方形、16:9、4:3）
- 調整裁切框大小和位置
- 點擊「執行裁切」完成裁切

### 步驟 3：編輯圖片
- **調整畫布尺寸**：選擇預設尺寸或自訂尺寸
- **移動和縮放**：拖曳圖片移動位置，拉動角落縮放大小
- **物件適應模式**：
  - 包含：圖片完整顯示在畫布內
  - 填滿：圖片填滿整個畫布（可能裁切部分內容）
  - 拉伸：圖片拉伸至畫布大小
- **重新裁切**：可隨時對目前圖片進行再次裁切
- **復原**：復原上一步操作

### 步驟 4：匯出圖片
- 選擇檔案格式（JPEG 或 PNG）
- 調整品質（JPEG 格式）
- 設定檔案大小限制（選填）
- 點擊「下載圖片」

## 🛠️ 技術棧

- **前端框架**: React 19.2.3
- **開發語言**: TypeScript 5.8.2
- **建置工具**: Vite 6.2.0
- **UI 圖標**: Lucide React
- **圖片裁切**: react-image-crop
- **樣式**: Tailwind CSS

## 📁 專案結構

```
image-editor/
├── public/              # 靜態資源（favicon、OG 圖片等）
├── src/
│   └── assets/          # 圖片資源
├── components/          # React 組件
│   └── MascotCharacter.tsx
├── services/            # 服務層
│   └── geminiService.ts
├── utils/               # 工具函數
│   └── imageProcessing.ts
├── App.tsx              # 主應用程式
├── index.tsx            # 入口文件
├── types.ts             # TypeScript 類型定義
└── vite.config.ts       # Vite 配置
```

## 🎨 預設尺寸

### 通用尺寸
- 正方形萬用圖 (1080x1080)
- 直式手機版 (1080x1350)
- 全直式限動/Threads (1080x1920)

### Facebook
- 動態貼文（橫式、正方、直式）
- 三圖主圖
- 限時動態

### Instagram
- 貼文（正方形、直式、橫式）
- 限動 / Reels

### Threads
- 貼文／輪播
- 連結預覽圖

## 🔒 隱私與安全

- ✅ 所有圖片處理都在瀏覽器本地完成
- ✅ 不會上傳任何檔案到伺服器
- ✅ 不會收集或儲存使用者資料
- ✅ 完全離線可用（建置後）

## 📝 授權

本專案採用 MIT 授權條款。

## 👤 作者

**Vivi Chen 大師姐**

- Facebook: [@vivichen.sister](https://www.facebook.com/vivichen.sister)
- 網站: [大師姐的工具包](https://image-editor.vivichen.ai)

## 🙏 致謝

感謝所有開源專案的貢獻者，讓這個工具得以實現。

---

<div align="center">
  Made with ❤️ by <a href="https://www.facebook.com/vivichen.sister">Vivi Chen 大師姐</a> | © 2025
</div>
