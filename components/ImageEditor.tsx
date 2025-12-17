import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop as ReactImageCropPixel, centerCrop, makeAspectCrop } from 'react-image-crop';
import { 
  Upload, 
  Scissors, 
  Download, 
  ArrowLeft, 
  Check,
  Maximize2,
  Trash2,
  AlertCircle,
  Link,
  Unlink,
  Layers,
  LayoutTemplate,
  Undo2,
  Scaling,
  Move,
  Crop as CropIcon,
  X,
  Smartphone,
  Facebook,
  Instagram,
  Grid,
  Settings2,
  Plus
} from 'lucide-react';
import { EditorStep, ExportSettings, PixelCrop, ResizeMode } from '../types';
import { getCroppedImg, resizeImageCanvas, compressImageToSize, createImage } from '../utils/imageProcessing';

// --- Presets Data ---
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

// Helper to center the crop initially
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export const ImageEditor: React.FC = () => {
  // --- State ---
  const [step, setStep] = useState<EditorStep>(EditorStep.UPLOAD);
  
  // History State
  const [history, setHistory] = useState<string[]>([]);

  // Images
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  // Cropper State (Global / Step 1)
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<ReactImageCropPixel>();
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  // In-Place Re-Crop State (Step 2)
  const [isReCropping, setIsReCropping] = useState(false);
  const reCropImgRef = useRef<HTMLImageElement>(null);

  // Resize/Canvas State
  const [dimensions, setDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [originalAspect, setOriginalAspect] = useState(1);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
  const [canvasColor, setCanvasColor] = useState<string>('#FFFFFF');
  const [objectScale, setObjectScale] = useState<number>(1);
  
  // Preset State
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('Universal');
  const [customPresets, setCustomPresets] = useState<PresetFormat[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  // Positioning & Scaling Interaction State
  const [objectPosition, setObjectPosition] = useState<{x: number, y: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  
  // References for Drag/Scale Math
  const dragStartRef = useRef<{ clientX: number, clientY: number, initialX: number, initialY: number } | null>(null);
  const scaleStartRef = useRef<{ clientY: number, initialScale: number, position: string } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Export State
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'image/png',
    quality: 0.9,
    maxSizeKB: undefined,
    maintainAspectRatio: true
  });
  const [estimatedSize, setEstimatedSize] = useState<string>('計算中...');

  // --- Init ---
  useEffect(() => {
    const saved = localStorage.getItem('customPresets');
    if (saved) {
        try {
            setCustomPresets(JSON.parse(saved));
        } catch(e) { console.error("Failed to load presets"); }
    }
  }, []);

  // --- Helpers for History ---
  const pushHistory = (newImage: string) => {
    setHistory(prev => [...prev, newImage]);
    setCurrentImage(newImage);
  };

  const handleUndo = () => {
    if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop();
        const previousImage = newHistory[newHistory.length - 1];
        setHistory(newHistory);
        setCurrentImage(previousImage);
        
        createImage(previousImage).then(img => {
             setOriginalAspect(img.width / img.height);
        });
    }
  };

  // --- Handlers ---
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result as string;
        setOriginalImage(result);
        setHistory([result]);
        setCurrentImage(result);
        setStep(EditorStep.CROP);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setObjectScale(1);
        setObjectPosition(null);
        
        createImage(result).then(img => {
            setDimensions({ width: img.width, height: img.height });
            setOriginalAspect(img.width / img.height);
        });
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialAspect = aspectRatio || (16 / 9);
    
    if (!crop) {
        setCrop(centerAspectCrop(width, height, initialAspect));
    }
  };

  useEffect(() => {
    if (step === EditorStep.CROP && imgRef.current && crop) {
        const { width, height } = imgRef.current;
        if (aspectRatio) {
            setCrop(centerAspectCrop(width, height, aspectRatio));
        }
    }
  }, [aspectRatio, step]);

  const handleApplyCrop = async () => {
    const sourceImage = originalImage || currentImage;

    if (sourceImage && completedCrop && imgRef.current) {
      try {
        const image = imgRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const actualCrop: PixelCrop = {
            x: completedCrop.x * scaleX,
            y: completedCrop.y * scaleY,
            width: completedCrop.width * scaleX,
            height: completedCrop.height * scaleY
        };

        const croppedImage = await getCroppedImg(sourceImage, actualCrop);
        pushHistory(croppedImage);
        
        const img = await createImage(croppedImage);
        setDimensions({ width: img.width, height: img.height });
        setOriginalAspect(img.width / img.height);
        setResizeMode('stretch');
        setObjectPosition(null);
        setObjectScale(1);
        setStep(EditorStep.EDIT);
      } catch (e) {
        console.error(e);
      }
    } else if (sourceImage && !completedCrop) {
        setCurrentImage(sourceImage);
        setStep(EditorStep.EDIT);
    }
  };

  const handleConfirmReCrop = async () => {
      if (currentImage && completedCrop && reCropImgRef.current) {
         try {
            const image = reCropImgRef.current;
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            const actualCrop: PixelCrop = {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY
            };

            const croppedImage = await getCroppedImg(currentImage, actualCrop);
            pushHistory(croppedImage);
            
            const img = await createImage(croppedImage);
            setOriginalAspect(img.width / img.height);
            setIsReCropping(false);
            setCrop(undefined);
         } catch(e) {
             console.error(e);
         }
      }
  };

  const handleResizeChange = (key: 'width' | 'height', value: number) => {
    setDimensions(prev => {
      let newDims = { ...prev, [key]: value };
      if (maintainAspect) {
        if (key === 'width') {
          newDims.height = Math.round(value / originalAspect);
        } else {
          newDims.width = Math.round(value * originalAspect);
        }
      }
      return newDims;
    });
  };

  const applyPreset = (w: number, h: number) => {
      setMaintainAspect(false);
      setDimensions({ width: w, height: h });
  };

  const addCustomPreset = () => {
    const name = newPresetName.trim() || `自定義 ${customPresets.length + 1}`;
    const newPreset = {
        name,
        w: dimensions.width,
        h: dimensions.height,
        label: '自訂'
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
    setNewPresetName('');
  };

  const deleteCustomPreset = (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const updated = customPresets.filter((_, i) => i !== index);
      setCustomPresets(updated);
      localStorage.setItem('customPresets', JSON.stringify(updated));
  };

  // --- Drag & Drop & Scale Logic ---
  const getObjectBounds = useCallback(() => {
      if (!currentImage) return { w: 0, h: 0 };
      
      let drawWidth = 0;
      let drawHeight = 0;
      const canvasW = dimensions.width;
      const canvasH = dimensions.height;
      const imgAspect = originalAspect;
      const canvasAspect = canvasW / canvasH;

      if (resizeMode === 'stretch') {
        drawWidth = canvasW;
        drawHeight = canvasH;
      } else if (resizeMode === 'contain') {
        if (imgAspect > canvasAspect) {
          drawWidth = canvasW;
          drawHeight = canvasW / imgAspect;
        } else {
          drawHeight = canvasH;
          drawWidth = canvasH * imgAspect;
        }
      } else if (resizeMode === 'cover') {
         if (imgAspect > canvasAspect) {
          drawHeight = canvasH;
          drawWidth = canvasH * imgAspect;
        } else {
          drawWidth = canvasW;
          drawHeight = canvasW / imgAspect;
        }
      }
      
      return {
          w: drawWidth * objectScale,
          h: drawHeight * objectScale
      };
  }, [dimensions, originalAspect, resizeMode, objectScale, currentImage]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (!previewContainerRef.current || isReCropping) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      let currentX = 0;
      let currentY = 0;
      const bounds = getObjectBounds();
      
      if (objectPosition) {
          currentX = objectPosition.x;
          currentY = objectPosition.y;
      } else {
          currentX = (dimensions.width - bounds.w) / 2;
          currentY = (dimensions.height - bounds.h) / 2;
      }

      setIsDragging(true);
      dragStartRef.current = {
          clientX,
          clientY,
          initialX: currentX,
          initialY: currentY
      };
  };

  const handleScaleMouseDown = (e: React.MouseEvent | React.TouchEvent, position: string) => {
      e.stopPropagation();
      if (isReCropping) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setIsScaling(true);
      scaleStartRef.current = {
          clientY,
          initialScale: objectScale,
          position
      };
  };

  const handleGlobalMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (isScaling && scaleStartRef.current) {
          e.preventDefault();
          const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
          let deltaY = scaleStartRef.current.clientY - clientY;
          
          if (scaleStartRef.current.position.includes('bottom')) {
              deltaY = -deltaY;
          }

          const sensitivity = 0.005;
          const newScale = Math.max(0.1, scaleStartRef.current.initialScale + (deltaY * sensitivity));
          setObjectScale(newScale);
          return;
      }

      if (isDragging && dragStartRef.current && previewContainerRef.current) {
        e.preventDefault(); 
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const deltaX = clientX - dragStartRef.current.clientX;
        const deltaY = clientY - dragStartRef.current.clientY;

        const containerRect = previewContainerRef.current.getBoundingClientRect();
        const scaleFactor = dimensions.width / containerRect.width; 

        const newX = dragStartRef.current.initialX + (deltaX * scaleFactor);
        const newY = dragStartRef.current.initialY + (deltaY * scaleFactor);

        setObjectPosition({ x: newX, y: newY });
      }
  };

  const handleGlobalUp = () => {
      setIsDragging(false);
      setIsScaling(false);
      dragStartRef.current = null;
      scaleStartRef.current = null;
  };

  const handleApplyResize = async () => {
    if(!currentImage) return;
    try {
        const resized = await resizeImageCanvas(
            currentImage, 
            dimensions.width, 
            dimensions.height, 
            resizeMode,
            canvasColor,
            objectScale,
            objectPosition
        );
        setCurrentImage(resized); 
        setStep(EditorStep.EXPORT);
    } catch(e) {
        console.error("Resize failed", e);
    }
  };

  const handleDownload = async () => {
      if (!currentImage) return;

      let blob: Blob | null;

      if (exportSettings.maxSizeKB) {
          blob = await compressImageToSize(currentImage, exportSettings.format, exportSettings.maxSizeKB);
      } else {
          const res = await fetch(currentImage);
           const canvas = document.createElement('canvas');
           const img = await createImage(currentImage);
           canvas.width = img.width;
           canvas.height = img.height;
           const ctx = canvas.getContext('2d');
           if(!ctx) return;
           if(exportSettings.format === 'image/jpeg') {
               ctx.fillStyle = '#FFF';
               ctx.fillRect(0,0, canvas.width, canvas.height);
           }
           ctx.drawImage(img, 0, 0);
           blob = await new Promise(r => canvas.toBlob(r, exportSettings.format, exportSettings.quality));
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `edited-image.${exportSettings.format === 'image/jpeg' ? 'jpg' : 'png'}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
  };

  useEffect(() => {
    if (step === EditorStep.EXPORT && currentImage) {
        const est = Math.round((currentImage.length * 3) / 4 / 1024);
        setEstimatedSize(`~${est} KB (原始大小)`);
    }
  }, [step, currentImage]);

  // --- Renders ---
  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all duration-300">
      <div className="text-center p-8">
        <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
          <Upload className="text-white w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">上傳圖片</h3>
        <p className="text-gray-600 mb-6">拖曳檔案至此，或點擊選擇</p>
        <label className="cursor-pointer bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-md">
          選擇檔案
          <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
        </label>
      </div>
    </div>
  );

  const renderCropper = () => (
    <div className="flex flex-col h-full">
      <div className="flex-grow flex items-center justify-center bg-gray-50 rounded-lg overflow-auto min-h-[400px] border border-gray-200 p-4">
        {originalImage && (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="max-h-[60vh]"
          >
            <img 
                ref={imgRef}
                alt="Crop me"
                src={originalImage} 
                onLoad={onImageLoad}
                style={{ maxHeight: '60vh', objectFit: 'contain' }}
            />
          </ReactCrop>
        )}
      </div>
      
      <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2">
           <span className="text-gray-600 text-sm font-medium mr-2 self-center">比例:</span>
           {[undefined, 1, 16/9, 4/3].map((r, i) => (
             <button
                key={i}
                onClick={() => setAspectRatio(r)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  aspectRatio === r 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
             >
               {r === undefined ? '自由' : r === 1 ? '正方形' : r === 16/9 ? '16:9' : '4:3'}
             </button>
           ))}
        </div>
        
        <div className="flex-grow"></div>

        <button 
            onClick={handleApplyCrop}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors ml-auto shadow-md"
        >
            <Scissors size={18} /> 執行裁切
        </button>
      </div>
    </div>
  );

  const renderEditor = () => {
    const bounds = getObjectBounds();
    const objectW = bounds.w;
    const objectH = bounds.h;
    
    let top = 0;
    let left = 0;

    if (objectPosition) {
        top = objectPosition.y;
        left = objectPosition.x;
    } else {
        top = (dimensions.height - objectH) / 2;
        left = (dimensions.width - objectW) / 2;
    }

    const styleTop = `${(top / dimensions.height) * 100}%`;
    const styleLeft = `${(left / dimensions.width) * 100}%`;
    const styleWidth = `${(objectW / dimensions.width) * 100}%`;
    const styleHeight = `${(objectH / dimensions.height) * 100}%`;

    return (
    <div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        onMouseMove={handleGlobalMove}
        onTouchMove={handleGlobalMove}
        onMouseUp={handleGlobalUp}
        onTouchEnd={handleGlobalUp}
        onMouseLeave={handleGlobalUp}
    >
       <div className="lg:col-span-2 flex flex-col gap-4">
           <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 flex-wrap gap-2 min-h-[52px] shadow-sm">
                {isReCropping ? (
                    <div className="flex gap-2 w-full justify-between items-center animate-in fade-in">
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                           <CropIcon size={16}/> 再次裁切模式
                        </span>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setIsReCropping(false)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors text-gray-700"
                             >
                                <X size={14} /> 取消
                             </button>
                             <button 
                                onClick={handleConfirmReCrop}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm transition-colors text-white font-medium shadow-md"
                             >
                                <Check size={14} /> 確認裁切
                             </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <span className="text-xs text-gray-600 px-2 flex items-center gap-2">
                           <Move size={14}/> 拖曳移動 · 拉動角落縮放
                        </span>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => {
                                    setIsReCropping(true);
                                    if(reCropImgRef.current) {
                                        const {width, height} = reCropImgRef.current;
                                        setCrop(centerAspectCrop(width, height, 16/9));
                                    } else {
                                        setCrop(undefined);
                                    }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors border border-gray-300 text-gray-700"
                                title="對目前的物件進行裁切"
                             >
                                <CropIcon size={14} /> 重新裁切
                             </button>
                             <button 
                                onClick={handleUndo}
                                disabled={history.length <= 1}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 rounded text-sm transition-colors border border-gray-300 text-gray-700"
                                title="復原上一步"
                             >
                                <Undo2 size={14} /> 復原
                             </button>
                        </div>
                    </>
                )}
           </div>

           {!isReCropping && (
               <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-600 uppercase tracking-wider font-semibold flex items-center gap-1">
                             物件適應
                        </label>
                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                            {[
                                { m: 'contain', icon: LayoutTemplate, label: '包含' },
                                { m: 'cover', icon: Maximize2, label: '填滿' },
                                { m: 'stretch', icon: ArrowLeft, label: '拉伸', cls: 'rotate-45' },
                            ].map(item => (
                                <button
                                    key={item.m}
                                    onClick={() => {
                                        setResizeMode(item.m as ResizeMode);
                                        setObjectPosition(null);
                                    }}
                                    className={`p-1.5 rounded-md transition-all ${
                                        resizeMode === item.m 
                                            ? 'bg-blue-500 text-white shadow' 
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                    }`}
                                    title={item.label}
                                >
                                    <item.icon size={16} className={item.cls || ''}/>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <label className="text-xs text-gray-600 uppercase tracking-wider font-semibold flex items-center gap-1">
                             <Scaling size={14} /> 縮放
                        </label>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="2.0" 
                            step="0.05" 
                            value={objectScale}
                            onChange={(e) => setObjectScale(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs text-gray-700 w-8 text-right">{Math.round(objectScale * 100)}%</span>
                    </div>
               </div>
           )}

           <div className="bg-gray-50 rounded-xl p-1 border border-gray-200 relative group flex items-center justify-center min-h-[400px] overflow-hidden select-none">
                <div 
                    ref={previewContainerRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    className={`relative transition-colors duration-300 ease-in-out shadow-2xl ${isDragging ? 'cursor-grabbing' : ''}`}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxWidth: '500px',
                        aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                        backgroundColor: canvasColor === 'transparent' ? 'transparent' : canvasColor,
                        backgroundImage: canvasColor === 'transparent' ? `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)` : 'none',
                        backgroundSize: '20px 20px',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    {currentImage && (
                        <>
                            {isReCropping ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                     <ReactCrop
                                        crop={crop}
                                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                                        onComplete={(c) => setCompletedCrop(c)}
                                        className="max-h-full max-w-full"
                                     >
                                         <img 
                                            ref={reCropImgRef}
                                            src={currentImage} 
                                            alt="Re-Crop"
                                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                            onLoad={(e) => {
                                                if(!crop) {
                                                    const { width, height } = e.currentTarget;
                                                    setCrop(centerAspectCrop(width, height, aspectRatio || 16/9));
                                                }
                                            }}
                                         />
                                     </ReactCrop>
                                </div>
                            ) : (
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: styleTop,
                                        left: styleLeft,
                                        width: styleWidth,
                                        height: styleHeight,
                                        cursor: isDragging ? 'grabbing' : 'grab',
                                        zIndex: 10
                                    }}
                                    className="group/obj"
                                >
                                    <img 
                                        src={currentImage} 
                                        alt="Object"
                                        draggable={false}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'fill',
                                            display: 'block'
                                        }}
                                    />
                                    
                                    <div className={`absolute inset-0 border-2 border-blue-500 pointer-events-none transition-opacity ${isDragging || isScaling ? 'opacity-100' : 'opacity-0 group-hover/obj:opacity-100'}`}></div>

                                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                                        <div
                                            key={pos}
                                            onMouseDown={(e) => handleScaleMouseDown(e, pos)}
                                            onTouchStart={(e) => handleScaleMouseDown(e, pos)}
                                            className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full z-20 transition-opacity ${isDragging || isScaling ? 'opacity-100' : 'opacity-0 group-hover/obj:opacity-100'}`}
                                            style={{
                                                top: pos.includes('top') ? '-6px' : 'auto',
                                                bottom: pos.includes('bottom') ? '-6px' : 'auto',
                                                left: pos.includes('left') ? '-6px' : 'auto',
                                                right: pos.includes('right') ? '-6px' : 'auto',
                                                cursor: (pos === 'top-left' || pos === 'bottom-right') ? 'nwse-resize' : 'nesw-resize'
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
           </div>
       </div>

       <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-gray-800 font-semibold flex items-center gap-2 mb-4">
                    <Layers className="text-blue-500" size={20}/> 畫布尺寸與設定
                </h3>
                
                <div className="space-y-6">
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
                                             <Plus size={14} /> 新增目前尺寸 ({dimensions.width}x{dimensions.height})
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

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <label className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1 block">寬度 (W)</label>
                                <input 
                                    type="number" 
                                    value={dimensions.width}
                                    onChange={(e) => handleResizeChange('width', parseInt(e.target.value) || 0)}
                                    className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex flex-col justify-end pb-1 pt-5">
                                <button 
                                    onClick={() => setMaintainAspect(!maintainAspect)}
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
                                    value={dimensions.height}
                                    onChange={(e) => handleResizeChange('height', parseInt(e.target.value) || 0)}
                                    className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {(resizeMode === 'contain' || objectScale < 1 || objectPosition) && (
                        <div>
                             <label className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2 block">畫布底色 (Background)</label>
                             <div className="flex gap-2">
                                 {['#FFFFFF', '#000000', '#00FF00'].map(c => (
                                     <button
                                        key={c}
                                        onClick={() => setCanvasColor(c)}
                                        className={`w-10 h-10 rounded-full border-2 relative overflow-hidden ${
                                            canvasColor === c 
                                                ? 'border-blue-500 ring-2 ring-blue-500/50' 
                                                : 'border-gray-300'
                                        }`}
                                        style={{ backgroundColor: c }}
                                        title={c === '#00FF00' ? '綠幕 (Green Screen)' : c}
                                     >
                                     </button>
                                 ))}
                                 <input 
                                    type="color"
                                    value={canvasColor === 'transparent' ? '#ffffff' : canvasColor}
                                    onChange={(e) => setCanvasColor(e.target.value)}
                                    className="w-10 h-10 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                                 />
                             </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-3">
                 <button 
                    onClick={handleApplyResize}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-md"
                >
                    前往匯出 <ArrowLeft className="rotate-180" size={18}/>
                </button>
                <button 
                    onClick={() => {
                        setOriginalImage(null);
                        setCurrentImage(null);
                        setStep(EditorStep.UPLOAD);
                        setHistory([]);
                    }}
                    className="w-full border border-gray-300 text-gray-600 hover:text-red-500 hover:border-red-300 py-2 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm"
                >
                    <Trash2 size={16}/> 捨棄並重新開始
                </button>
            </div>
       </div>
    </div>
  );
  };

  const renderExport = () => (
    <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
             <div className="p-8 bg-gray-50 flex flex-col items-center justify-center border-r border-gray-200 relative">
                 <div className="absolute inset-0 z-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMzMzMiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')]"></div>
                 {currentImage && <img src={currentImage} className="relative z-10 max-w-full max-h-[300px] shadow-lg rounded-lg object-contain" alt="Final" />}
                 <div className="relative z-10 mt-4 text-gray-600 text-sm bg-white/80 px-3 py-1 rounded-full border border-gray-200">
                    {dimensions.width} x {dimensions.height} px
                 </div>
             </div>
             
             <div className="p-8 flex flex-col gap-6">
                 <div>
                     <h2 className="text-2xl font-bold text-gray-800 mb-1">匯出設定</h2>
                     <p className="text-gray-600 text-sm">設定您的最終檔案</p>
                 </div>

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
                         {exportSettings.format === 'image/jpeg' && canvasColor === 'transparent' && (
                             <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                                 <AlertCircle size={12} /> JPEG 不支援透明背景，將會以白色填滿。
                             </p>
                         )}
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
                 </div>

                 <div className="mt-auto pt-4 space-y-3">
                     <button 
                        onClick={handleDownload}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                     >
                         <Download size={20} /> 下載圖片
                     </button>
                     <button 
                        onClick={() => setStep(EditorStep.EDIT)}
                        className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
                     >
                         返回編輯
                     </button>
                     <button 
                        onClick={() => {
                            setOriginalImage(null);
                            setCurrentImage(null);
                            setStep(EditorStep.UPLOAD);
                            setHistory([]);
                            setCrop(undefined);
                            setCompletedCrop(undefined);
                            setDimensions({ width: 0, height: 0 });
                            setObjectPosition(null);
                            setObjectScale(1);
                        }}
                        className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                     >
                         <Upload size={18} /> 再編輯一張圖片
                     </button>
                 </div>
             </div>
        </div>
    </div>
  );

  const stepsLabels = {
      [EditorStep.UPLOAD]: '上傳',
      [EditorStep.CROP]: '裁切',
      [EditorStep.EDIT]: '編輯',
      [EditorStep.EXPORT]: '匯出'
  };

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-center">
        <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          {[EditorStep.UPLOAD, EditorStep.CROP, EditorStep.EDIT, EditorStep.EXPORT].map((s, i) => (
            <div 
              key={s}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                step === s 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-gray-500 cursor-default hover:text-gray-700'
              }`}
            >
              {i + 1}. {stepsLabels[s]}
            </div>
          ))}
        </div>
      </div>

      <div>
        {step === EditorStep.UPLOAD && renderUpload()}
        {step === EditorStep.CROP && renderCropper()}
        {step === EditorStep.EDIT && renderEditor()}
        {step === EditorStep.EXPORT && renderExport()}
      </div>
    </div>
  );
};

