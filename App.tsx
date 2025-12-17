import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Image as ImageIcon, Grid } from 'lucide-react';
import { ToolType } from './types';
import { ImageEditor } from './components/ImageEditor';
import { CollageEditor } from './components/CollageEditor';
import { MascotCharacter } from './components/MascotCharacter';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('image-editor');

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col overflow-x-hidden" style={{ background: 'var(--gradient-bg)' }}>
      <div className="max-w-6xl mx-auto flex-1 w-full">
        {/* Header */}
        <div className="text-center mb-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            大師姐的工具包
          </div>
          <h1 className="text-3xl font-bold gradient-text">
            {activeTool === 'image-editor' ? '圖片編輯器' : '拼圖工具'}
          </h1>
          <p className="text-gray-600">
            {activeTool === 'image-editor' 
              ? '這是一款易用圖片編輯工具，包含自由裁切、調整成常見社群或自訂尺寸，下載也可指定檔案大小喔'
              : '選擇版型，拖放圖片到框格中，調整位置後合成輸出一張圖片'}
          </p>
          
          {/* Privacy Notice */}
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full flex-wrap justify-center">
            <ShieldCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span className="text-center">所有處理皆在本機完成，檔案不會上傳至雲端伺服器，請安心使用。</span>
          </div>
        </div>

        {/* Tool Selector */}
        <div className="mb-8 flex justify-center">
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTool('image-editor')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTool === 'image-editor'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ImageIcon size={18} />
              圖片編輯器
            </button>
            <button
              onClick={() => setActiveTool('collage')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTool === 'collage'
                    ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Grid size={18} />
              拼圖工具
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="glass-card p-6">
          {activeTool === 'image-editor' && <ImageEditor />}
          {activeTool === 'collage' && <CollageEditor />}
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-600 mt-8 pb-4">
        <p>
          Made with ❤️ by{" "}
          <a href="https://www.facebook.com/vivichen.sister" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
            Vivi Chen 大師姐
          </a>
          {" "}| © 2025
        </p>
      </footer>

      {/* Mascot */}
      <MascotCharacter />
    </div>
  );
};

export default App;