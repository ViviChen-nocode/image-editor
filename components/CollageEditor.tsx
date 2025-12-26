import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Grid,
  LayoutTemplate,
  X,
  Move,
  ZoomIn,
  ZoomOut,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  Smartphone,
  Facebook,
  Instagram,
  Settings2,
  Plus,
  Link,
  Unlink,
  Layers
} from 'lucide-react';
import { Layout, LayoutCell, CellImage, ExportSettings } from '../types';
import { createImage, compressImageToSize, hasTransparency } from '../utils/imageProcessing';

// 預設尺寸（與 ImageEditor 共用）
type PresetFormat = { name: string; w: number; h: number; label: string };
type PresetCategory = 'Universal' | 'Facebook' | 'Instagram' | 'Threads' | 'Custom';

const PRESETS: Record<string, PresetFormat[]> = {
  'Universal': [
    { name: '正方形萬用圖', w: 1080, h: 1080, label: '1:1' },
    { name: '直式手機版', w: 1080, h: 1350, label: '4:5' },
    { name: '全直式 (限動/Threads)', w: 1080, h: 1920, label: '9:16' },
  ],
  'Facebook': [
    { name: '動態貼文－橫式', w: 1200, h: 630, label: '1.91:1' },
    { name: '動態貼文－正方', w: 1080, h: 1080, label: '1:1' },
    { name: '動態貼文－直式', w: 1080, h: 1350, label: '4:5' },
    { name: '三圖主圖（上橫）', w: 1200, h: 600, label: '2:1' },
    { name: '三圖主圖（左直）', w: 600, h: 1200, label: '1:2' },
    { name: '三圖次圖（方形）', w: 600, h: 600, label: '1:1' },
    { name: '限時動態', w: 1080, h: 1920, label: '9:16' },
  ],
  'Instagram': [
    { name: '貼文－正方形', w: 1080, h: 1080, label: '1:1' },
    { name: '貼文－直式', w: 1080, h: 1350, label: '4:5' },
    { name: '貼文－橫式', w: 1080, h: 566, label: '1.91:1' },
    { name: '限動 / Reels', w: 1080, h: 1920, label: '9:16' },
  ],
  'Threads': [
    { name: '貼文／輪播', w: 1080, h: 1920, label: '9:16' },
    { name: '連結預覽圖', w: 1200, h: 600, label: '2:1' },
  ]
};

// 版型模板（使用百分比，可適應任何尺寸）
const LAYOUT_TEMPLATES = [
  {
    id: 'single',
    name: '單張全版',
    cells: [
      { id: 'cell-1', x: 0, y: 0, width: 100, height: 100 }
    ],
    gap: 0
  },
  {
    id: 'split-horizontal',
    name: '左右對分 (1:1)',
    cells: [
      { id: 'cell-1', x: 0, y: 0, width: 50, height: 100 },
      { id: 'cell-2', x: 50, y: 0, width: 50, height: 100 }
    ],
    gap: 10
  },
  {
    id: 'split-vertical',
    name: '上下對分',
    cells: [
      { id: 'cell-1', x: 0, y: 0, width: 100, height: 50 },
      { id: 'cell-2', x: 0, y: 50, width: 100, height: 50 }
    ],
    gap: 10
  },
  {
    id: 'three-left-right',
    name: '三格 (左1右2)',
    cells: [
      { id: 'cell-1', x: 0, y: 0, width: 50, height: 100 },
      { id: 'cell-2', x: 50, y: 0, width: 50, height: 50 },
      { id: 'cell-3', x: 50, y: 50, width: 50, height: 50 }
    ],
    gap: 10
  },
  {
    id: 'four-grid',
    name: '四格網格',
    cells: [
      { id: 'cell-1', x: 0, y: 0, width: 50, height: 50 },
      { id: 'cell-2', x: 50, y: 0, width: 50, height: 50 },
      { id: 'cell-3', x: 0, y: 50, width: 50, height: 50 },
      { id: 'cell-4', x: 50, y: 50, width: 50, height: 50 }
    ],
    gap: 10
  }
];

export const CollageEditor: React.FC = () => {
  // 畫布尺寸
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [maintainAspect, setMaintainAspect] = useState(false);
  const [originalAspect, setOriginalAspect] = useState(1200 / 1080);

  // 版型選擇
  const [selectedLayoutTemplate, setSelectedLayoutTemplate] = useState(LAYOUT_TEMPLATES[0]);
  const [selectedLayout, setSelectedLayout] = useState<Layout>(() => ({
    ...LAYOUT_TEMPLATES[0],
    canvasWidth: 1200,
    canvasHeight: 1080
  }));

  // 尺寸預設
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('Universal');
  const [customPresets, setCustomPresets] = useState<PresetFormat[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  const [cellImages, setCellImages] = useState<CellImage[]>([]);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'image/jpeg',
    quality: 1.0, // 預設最高品質（100%）
    maxSizeKB: undefined,
    maintainAspectRatio: true
  });

  // 拖放相關狀態
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 框內調整狀態（Pan/Zoom）
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isZooming, setIsZooming] = useState(false);

  // 載入自訂預設
  useEffect(() => {
    const saved = localStorage.getItem('customPresets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch(e) { console.error("Failed to load presets"); }
    }
  }, []);

  // 當版型模板或尺寸改變時，更新 selectedLayout
  useEffect(() => {
    setSelectedLayout({
      ...selectedLayoutTemplate,
      canvasWidth,
      canvasHeight
    });
  }, [selectedLayoutTemplate, canvasWidth, canvasHeight]);

  // 應用預設尺寸
  const applyPreset = (w: number, h: number) => {
    setMaintainAspect(false);
    setCanvasWidth(w);
    setCanvasHeight(h);
    setOriginalAspect(w / h);
  };

  // 添加自訂預設
  const addCustomPreset = () => {
    const name = newPresetName.trim() || `自定義 ${customPresets.length + 1}`;
    const newPreset = {
      name,
      w: canvasWidth,
      h: canvasHeight,
      label: '自訂'
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
    setNewPresetName('');
  };

  // 刪除自訂預設
  const deleteCustomPreset = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = customPresets.filter((_, i) => i !== index);
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
  };

  // 處理尺寸變更
  const handleResizeChange = (key: 'width' | 'height', value: number) => {
    if (key === 'width') {
      setCanvasWidth(value);
      if (maintainAspect) {
        setCanvasHeight(Math.round(value / originalAspect));
      }
    } else {
      setCanvasHeight(value);
      if (maintainAspect) {
        setCanvasWidth(Math.round(value * originalAspect));
      }
    }
  };

  // 計算實際的框格位置（考慮 gap）
  const calculateCellBounds = useCallback((cell: LayoutCell, canvasWidth: number, canvasHeight: number, gap: number = 0) => {
    const cellWidth = (cell.width / 100) * canvasWidth;
    const cellHeight = (cell.height / 100) * canvasHeight;
    const cellX = (cell.x / 100) * canvasWidth;
    const cellY = (cell.y / 100) * canvasHeight;

    // 如果有 gap，需要調整位置和大小
    const gapX = gap;
    const gapY = gap;
    const adjustedX = cellX + gapX;
    const adjustedY = cellY + gapY;
    const adjustedWidth = cellWidth - (gapX * 2);
    const adjustedHeight = cellHeight - (gapY * 2);

    return {
      x: adjustedX,
      y: adjustedY,
      width: adjustedWidth,
      height: adjustedHeight
    };
  }, []);

  // 處理檔案拖放
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredCellId(cellId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setHoveredCellId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredCellId(null);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageSrc = event.target?.result as string;
        // Check if the image has transparency
        const hasTrans = await hasTransparency(imageSrc);
        setCellImages(prev => {
          const filtered = prev.filter(img => img.cellId !== cellId);
          return [...filtered, {
            cellId,
            imageSrc,
            scale: 1.0,
            positionX: 0,
            positionY: 0,
            hasTransparency: hasTrans
          }];
        });
        setActiveCellId(cellId);
      };
      reader.readAsDataURL(file);
    }
  };

  // 處理檔案選擇
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, cellId: string) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageSrc = event.target?.result as string;
        // Check if the image has transparency
        const hasTrans = await hasTransparency(imageSrc);
        setCellImages(prev => {
          const filtered = prev.filter(img => img.cellId !== cellId);
          return [...filtered, {
            cellId,
            imageSrc,
            scale: 1.0,
            positionX: 0,
            positionY: 0,
            hasTransparency: hasTrans
          }];
        });
        setActiveCellId(cellId);
      };
      reader.readAsDataURL(file);
    }
  };

  // 框內圖片拖動（Pan）
  const handleCellImageMouseDown = (e: React.MouseEvent, cellId: string) => {
    e.stopPropagation();
    setIsDraggingImage(true);
    setActiveCellId(cellId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleCellImageMouseMove = (e: React.MouseEvent) => {
    if (isDraggingImage && dragStart && activeCellId) {
      const cellImage = cellImages.find(img => img.cellId === activeCellId);
      if (cellImage && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const cell = selectedLayout.cells.find(c => c.id === activeCellId);
        if (cell) {
          const bounds = calculateCellBounds(cell, selectedLayout.canvasWidth, selectedLayout.canvasHeight, selectedLayout.gap);
          const displaySize = getDisplaySize();
          const scale = displaySize.width / selectedLayout.canvasWidth;
          
          // 計算實際框格在畫布上的像素位置
          const cellDisplayWidth = bounds.width * scale;
          const cellDisplayHeight = bounds.height * scale;
          
          // 將滑鼠移動距離轉換為畫布像素
          const deltaX = (e.clientX - dragStart.x) / scale;
          const deltaY = (e.clientY - dragStart.y) / scale;

          setCellImages(prev => prev.map(img => 
            img.cellId === activeCellId 
              ? { ...img, positionX: img.positionX + deltaX, positionY: img.positionY + deltaY }
              : img
          ));
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    }
  };

  const handleCellImageMouseUp = () => {
    setIsDraggingImage(false);
    setDragStart(null);
  };

  // 框內圖片縮放（Zoom）
  const handleCellImageWheel = (e: React.WheelEvent, cellId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cellImage = cellImages.find(img => img.cellId === cellId);
    if (cellImage) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.5, Math.min(3.0, cellImage.scale + delta));
      
      setCellImages(prev => prev.map(img => 
        img.cellId === cellId 
          ? { ...img, scale: newScale }
          : img
      ));
    }
  };

  // 移除框格中的圖片
  const removeCellImage = (cellId: string) => {
    setCellImages(prev => prev.filter(img => img.cellId !== cellId));
    if (activeCellId === cellId) {
      setActiveCellId(null);
    }
  };

  // 切換版型模板時清除圖片
  const handleLayoutTemplateChange = (template: typeof LAYOUT_TEMPLATES[0]) => {
    setSelectedLayoutTemplate(template);
    setCellImages([]);
    setActiveCellId(null);
  };

  // 匯出合成圖
  const handleExport = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = selectedLayout.canvasWidth;
    canvas.height = selectedLayout.canvasHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Check if all images have transparency and exporting as PNG
    const allImagesHaveTransparency = cellImages.length > 0 && 
      cellImages.every(img => img.hasTransparency === true);
    const shouldPreserveTransparency = allImagesHaveTransparency && 
      exportSettings.format === 'image/png';

    // 繪製背景（如果所有圖片都是透明PNG且匯出PNG，則保持透明）
    if (exportSettings.format === 'image/jpeg' || !shouldPreserveTransparency) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // If shouldPreserveTransparency is true, don't fill background (transparent)

    // 繪製每個框格的圖片
    for (const cell of selectedLayout.cells) {
      const cellImage = cellImages.find(img => img.cellId === cell.id);
      if (cellImage) {
        const bounds = calculateCellBounds(cell, selectedLayout.canvasWidth, selectedLayout.canvasHeight, selectedLayout.gap);
        
        // 創建臨時 canvas 用於遮罩
        const cellCanvas = document.createElement('canvas');
        cellCanvas.width = bounds.width;
        cellCanvas.height = bounds.height;
        const cellCtx = cellCanvas.getContext('2d');
        
        if (cellCtx) {
          // 載入圖片
          const img = await createImage(cellImage.imageSrc);
          
          // 計算圖片在框格內的顯示尺寸和位置（使用 contain 模式確保完整顯示）
          const imgAspect = img.width / img.height;
          const cellAspect = bounds.width / bounds.height;
          
          // 計算基礎尺寸（contain 模式：完整顯示圖片）
          let baseWidth = bounds.width;
          let baseHeight = bounds.height;
          
          if (imgAspect > cellAspect) {
            // 圖片較寬，以寬度為準
            baseHeight = bounds.width / imgAspect;
          } else {
            // 圖片較高，以高度為準
            baseWidth = bounds.height * imgAspect;
          }
          
          // 應用 scale
          let drawWidth = baseWidth * cellImage.scale;
          let drawHeight = baseHeight * cellImage.scale;
          
          // 計算位置（考慮 positionX 和 positionY）
          const offsetX = bounds.width / 2 - drawWidth / 2 + cellImage.positionX;
          const offsetY = bounds.height / 2 - drawHeight / 2 + cellImage.positionY;
          
          // 先保存狀態
          cellCtx.save();
          
          // 設置裁剪區域（遮罩）
          cellCtx.beginPath();
          cellCtx.rect(0, 0, bounds.width, bounds.height);
          cellCtx.clip();
          
          // 繪製圖片（超出部分會被裁剪）
          cellCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          
          // 恢復狀態
          cellCtx.restore();
          
          // 將遮罩後的圖片繪製到主 canvas
          ctx.drawImage(cellCanvas, bounds.x, bounds.y);
        }
      }
    }

    // 轉換為 blob 並下載
    let blob: Blob | null;
    
    if (exportSettings.maxSizeKB) {
      const dataUrl = canvas.toDataURL('image/png');
      blob = await compressImageToSize(dataUrl, exportSettings.format, exportSettings.maxSizeKB);
    } else {
      blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, exportSettings.format, exportSettings.quality);
      });
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `collage.${exportSettings.format === 'image/jpeg' ? 'jpg' : 'png'}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // 計算畫布顯示尺寸
  const getDisplaySize = () => {
    if (!containerRef.current) return { width: 800, height: 600 };
    const containerWidth = containerRef.current.clientWidth;
    const aspect = selectedLayout.canvasWidth / selectedLayout.canvasHeight;
    const maxWidth = Math.min(containerWidth - 32, 800);
    return {
      width: maxWidth,
      height: maxWidth / aspect
    };
  };

  const displaySize = getDisplaySize();
  const scale = displaySize.width / selectedLayout.canvasWidth;

  return (
    <div className="w-full space-y-6">
      {/* 尺寸選擇器 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-gray-800 font-semibold flex items-center gap-2 mb-4">
          <Layers className="text-blue-500" size={20}/> 畫布尺寸
        </h3>
        
        <div className="space-y-6">
          {/* Presets - Platform Selector */}
          <div className="space-y-3">
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: 'Universal', icon: Smartphone, label: '通用' },
                { id: 'Facebook', icon: Facebook, label: 'FB' },
                { id: 'Instagram', icon: Instagram, label: 'IG' },
                { id: 'Threads', icon: Grid, label: 'Threads' },
                { id: 'Custom', icon: Settings2, label: '自訂' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as PresetCategory)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <cat.icon size={14} /> {cat.label}
                </button>
              ))}
            </div>
            
            {/* Preset Buttons Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {selectedCategory === 'Custom' ? (
                <div className="col-span-2 space-y-3">
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 space-y-2 sticky top-0 z-10">
                    <input 
                      type="text" 
                      placeholder="輸入名稱 (例如: 我的專用圖)" 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-md p-2 outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                    <button 
                      onClick={addCustomPreset}
                      className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center justify-center gap-2 text-xs font-bold transition-colors shadow-sm"
                    >
                      <Plus size={14} /> 新增目前尺寸 ({canvasWidth}x{canvasHeight})
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    {customPresets.map((preset, idx) => (
                      <div key={idx} className="flex gap-1 group">
                        <button
                          onClick={() => applyPreset(preset.w, preset.h)}
                          className="flex-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left border border-gray-300"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-gray-800 truncate">{preset.name}</span>
                            <span className="text-[10px] text-gray-600">{preset.w}x{preset.h}</span>
                          </div>
                        </button>
                        <button 
                          onClick={(e) => deleteCustomPreset(idx, e)}
                          className="px-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-500 rounded-lg border border-gray-300 transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {customPresets.length === 0 && (
                      <div className="text-center text-gray-500 text-xs py-2">
                        暫無自訂尺寸
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                PRESETS[selectedCategory].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(preset.w, preset.h)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left border border-gray-300 hover:border-blue-500 transition-all group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 truncate mr-2">{preset.name}</span>
                      <span className="text-[10px] bg-white px-1 rounded text-gray-600 border border-gray-200">{preset.label}</span>
                    </div>
                    <div className="text-[10px] text-gray-600">{preset.w} x {preset.h}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Manual Dimensions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex-1">
                <label className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1 block">寬度 (W)</label>
                <input 
                  type="number" 
                  value={canvasWidth}
                  onChange={(e) => handleResizeChange('width', parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col justify-end pb-1 pt-5">
                <button 
                  onClick={() => {
                    setMaintainAspect(!maintainAspect);
                    if (!maintainAspect) {
                      setOriginalAspect(canvasWidth / canvasHeight);
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors border ${
                    maintainAspect 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-800'
                  }`}
                  title={maintainAspect ? "解除比例鎖定" : "鎖定長寬比例"}
                >
                  {maintainAspect ? <Link size={18} /> : <Unlink size={18} />}
                </button>
              </div>

              <div className="flex-1">
                <label className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1 block">高度 (H)</label>
                <input 
                  type="number" 
                  value={canvasHeight}
                  onChange={(e) => handleResizeChange('height', parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 版型選擇器 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-gray-800 font-semibold flex items-center gap-2 mb-4">
          <LayoutTemplate className="text-blue-500" size={20} /> 選擇版型
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {LAYOUT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleLayoutTemplateChange(template)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedLayoutTemplate.id === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="text-sm font-medium text-gray-800 mb-2">{template.name}</div>
              <div className="text-xs text-gray-600">{canvasWidth} x {canvasHeight}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 畫布區域 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div 
          ref={containerRef}
          className="bg-gray-50 rounded-lg p-4 flex items-center justify-center"
          style={{ minHeight: '500px' }}
        >
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: `${displaySize.width}px`,
              height: `${displaySize.height}px`,
              position: 'relative'
            }}
            onMouseMove={handleCellImageMouseMove}
            onMouseUp={handleCellImageMouseUp}
            onMouseLeave={handleCellImageMouseUp}
          >
            {selectedLayout.cells.map((cell) => {
              const bounds = calculateCellBounds(cell, selectedLayout.canvasWidth, selectedLayout.canvasHeight, selectedLayout.gap);
              const cellImage = cellImages.find(img => img.cellId === cell.id);
              const isHovered = hoveredCellId === cell.id;
              const isActive = activeCellId === cell.id;

              return (
                <div
                  key={cell.id}
                  className="absolute border-2 border-dashed transition-all"
                  style={{
                    left: `${bounds.x * scale}px`,
                    top: `${bounds.y * scale}px`,
                    width: `${bounds.width * scale}px`,
                    height: `${bounds.height * scale}px`,
                    borderColor: isHovered || isActive 
                      ? '#3b82f6' 
                      : cellImage 
                        ? '#10b981' 
                        : '#d1d5db',
                    backgroundColor: isHovered ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    overflow: 'hidden',
                    cursor: cellImage ? (isDraggingImage && isActive ? 'grabbing' : 'grab') : 'default'
                  }}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, cell.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cell.id)}
                  onWheel={(e) => cellImage && handleCellImageWheel(e, cell.id)}
                  onClick={() => setActiveCellId(cell.id)}
                >
                  {cellImage ? (
                    <div className="relative w-full h-full" style={{ overflow: 'hidden' }}>
                      <img
                        src={cellImage.imageSrc}
                        alt={`Cell ${cell.id}`}
                        draggable={false}
                        className="absolute select-none"
                        style={{
                          objectFit: 'contain', // 使用 contain 確保完整顯示
                          left: `50%`,
                          top: `50%`,
                          transform: `translate(calc(-50% + ${cellImage.positionX * scale}px), calc(-50% + ${cellImage.positionY * scale}px)) scale(${cellImage.scale})`,
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: '100%',
                          height: '100%',
                          cursor: isDraggingImage && isActive ? 'grabbing' : 'grab',
                          pointerEvents: 'auto'
                        }}
                        onMouseDown={(e) => handleCellImageMouseDown(e, cell.id)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCellImage(cell.id);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                        title="移除圖片"
                      >
                        <X size={14} />
                      </button>
                      {isActive && (
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
                          <Move size={12} /> 拖動移動
                          <ZoomIn size={12} /> 滾輪縮放
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-xs">拖放圖片至此</span>
                      <label className="mt-2 text-xs text-blue-500 hover:text-blue-600 cursor-pointer">
                        或點擊選擇
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, cell.id)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 匯出設定 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-gray-800 font-semibold flex items-center gap-2 mb-4">
          <Download className="text-blue-500" size={20} /> 匯出設定
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">格式</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportSettings(s => ({...s, format: 'image/jpeg'}))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  exportSettings.format === 'image/jpeg'
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                JPEG
              </button>
              <button
                onClick={() => setExportSettings(s => ({...s, format: 'image/png'}))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  exportSettings.format === 'image/png'
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PNG
              </button>
            </div>
          </div>

          {exportSettings.format === 'image/jpeg' && (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">品質</label>
                <span className="text-sm text-gray-600">{Math.round(exportSettings.quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={exportSettings.quality}
                onChange={(e) => setExportSettings(s => ({...s, quality: parseFloat(e.target.value)}))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">檔案大小限制 (選填)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="例如: 500"
                value={exportSettings.maxSizeKB || ''}
                onChange={(e) => setExportSettings(s => ({...s, maxSizeKB: e.target.value ? parseInt(e.target.value) : undefined}))}
                className="flex-1 bg-white border border-gray-300 text-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
              />
              <span className="text-gray-600 font-medium">KB</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">若設定此項，系統將會嘗試降低品質以符合大小。</p>
          </div>

          <button
            onClick={handleExport}
            disabled={cellImages.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} /> 下載合成圖
          </button>
        </div>
      </div>
    </div>
  );
};

