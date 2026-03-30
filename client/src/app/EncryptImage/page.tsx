"use client";
import Image from "next/image";
import React, { useState } from "react";
import { CardBody, CardContainer, CardItem } from "../../../components/ui/3d-card";
import { BackgroundBeams } from "../../../components/ui/background-beams";
import { NavbarDemo } from "../nav";
import Swal from "sweetalert2";
import axios from "axios";
import { API_BASE_URL } from "../../utils/constants";
import { SteganoProgress } from "../../../components/ui/stegano-progress";
import { Loader2, ShieldCheck, Image as ImageIcon, ArrowRightLeft, FlaskConical, ScanEye, History, Download, RefreshCcw } from "lucide-react";

interface ImageInfo {
  size: number;
  width: number;
  height: number;
}

function EncryptImage() {
  const [selectedImages, setSelectedImages] = useState<(string | null)[]>([null, null]);
  const [imageInfo, setImageInfo] = useState<(ImageInfo | null)[]>([null, null]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newSelectedImages = [...selectedImages];
        newSelectedImages[index] = reader.result as string;
        setSelectedImages(newSelectedImages);
        setResultImage(null);

        const img = new window.Image();
        img.onload = () => {
          const newImageInfo = [...imageInfo];
          newImageInfo[index] = {
            size: file.size,
            width: img.width,
            height: img.height,
          };
          setImageInfo(newImageInfo);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHideClick = async () => {
    if (!selectedImages[0] || !selectedImages[1]) {
      Swal.fire({ title: "Missing Images", text: "Select both host and secret images.", icon: "warning", confirmButtonColor: '#10b981' });
      return;
    }

    if (imageInfo[0] && imageInfo[1] && (imageInfo[1].width > imageInfo[0].width || imageInfo[1].height > imageInfo[0].height)) {
      Swal.fire({ title: "Resolution Conflict", text: "The secret image cannot be larger than the host image.", icon: "error", confirmButtonColor: '#ef4444' });
      return;
    }

    const { value: password } = await Swal.fire({
      title: "Secure Your Payload",
      input: "password",
      inputLabel: "Decryption Password",
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      background: '#0a0a0a',
      color: '#fff',
    });

    if (password === undefined) return;
    if (!password) {
      Swal.fire({ title: "Error", text: "Password is required for encryption.", icon: "error", confirmButtonColor: '#ef4444' });
      return;
    }

    setLoading(true);
    setProgress(0);
    const formData = new FormData();
    selectedImages.forEach((image, index) => {
      if (image) {
        formData.append(`image${index + 1}`, dataURLtoFile(image, `image${index + 1}.png`));
      }
    });
    formData.append("password", password);

    try {
      const response = await axios.post(`${API_BASE_URL}/encrypt_images`, formData, {
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 0));
          setProgress(percentCompleted);
        }
      });

      const blob = new Blob([response.data]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResultImage(reader.result as string);
      };
      reader.readAsDataURL(blob);

      Swal.fire({ 
        title: "Protocol Success", 
        text: "Data integrated with zero visual disruption. Lab access granted.", 
        icon: "success", 
        confirmButtonColor: '#10b981',
        background: '#0a0a0a',
        color: '#fff',
        timer: 1500
      });
    } catch (error: any) {
      Swal.fire({ title: "Processing Error", text: "Failed to merge images. Ensure they are valid PNG/JPG.", icon: "error", confirmButtonColor: '#ef4444' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDemoClick = () => {
    if (!selectedImages[0]) {
      Swal.fire({ title: "Carrier Required", text: "Please upload a carrier image to preview the lab.", icon: "info", confirmButtonColor: '#10b981' });
      return;
    }
    setResultImage(selectedImages[0]);
    Swal.fire({ title: "Lab Demo Active", icon: "success", timer: 1000, showConfirmButton: false });
  };

  const handleDownloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "stego_transmission.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, { type: mime });
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden pb-40 px-4 select-none">
      <NavbarDemo />
      <SteganoProgress isVisible={loading} progress={progress} statusText="Weaving secret pixels..." />
      
      <div className="relative z-10 container mx-auto pt-48 max-w-7xl">
        <div className="text-center mb-24 space-y-6">
            <h1 className="text-5xl md:text-[6rem] font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-600 tracking-tighter leading-[0.8] uppercase">
                Bit Fusion <span className="text-emerald-500 italic">Pro</span>
            </h1>
            <p className="text-neutral-500 text-xl font-medium">Merge high-resolution layers with mathematical precision.</p>
        </div>

        {/* PHASES INDICATOR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 px-4">
            {[ 
                { icon: <ImageIcon size={24} className="text-emerald-500" />, title: "Carrier Source", desc: "The visible image that acts as the cover." },
                { icon: <FlaskConical size={24} className="text-sky-500" />, title: "Secret Layer", desc: "The hidden image buried in the bits." },
                { icon: <ShieldCheck size={24} className="text-amber-500" />, title: "Security Hub", desc: "Encrypted with AES-256 before bit weaving." }
            ].map((step, idx) => (
                <div key={idx} className="flex gap-6 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                    <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all h-fit">
                        {step.icon}
                    </div>
                    <div>
                        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-1 opacity-80">PH-0{idx + 1}. {step.title}</h3>
                        <p className="text-xs text-neutral-500 leading-relaxed font-medium">{step.desc}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch mb-24">
          <ThreeDCardDemo index={0} selectedImage={selectedImages[0]} handleImageChange={handleImageChange(0)} imageInfo={imageInfo[0]} title="Host Transmission" color="emerald" icon={<ImageIcon />} />
          <ThreeDCardDemo index={1} selectedImage={selectedImages[1]} handleImageChange={handleImageChange(1)} imageInfo={imageInfo[1]} title="Secret Payload" color="sky" icon={<ShieldCheck />} />
        </div>

        <div className="flex flex-col items-center gap-12 mt-12">
            {!resultImage ? (
                <>
                    <button 
                        onClick={handleHideClick} 
                        disabled={loading} 
                        className="group relative h-20 w-full max-w-2xl bg-white text-black rounded-[30px] font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <ScanEye size={28} />}
                        START BIT FUSION
                    </button>
                    <button onClick={handleDemoClick} className="group flex items-center gap-2 text-neutral-600 hover:text-white transition-all text-[10px] uppercase font-black tracking-[0.5em] opacity-40 hover:opacity-100">
                        <History size={14} /> Open Verification Lab
                    </button>
                </>
            ) : (
                <div className="flex gap-4 w-full max-w-2xl animate-in fade-in zoom-in duration-500">
                    <button 
                        onClick={handleDownloadResult} 
                        className="flex-[2] h-20 bg-emerald-500 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20"
                    >
                        <Download /> Download Result
                    </button>
                    <button 
                        onClick={() => {setSelectedImages([null, null]); setResultImage(null);}} 
                        className="flex-1 h-20 bg-white/[0.05] border border-white/10 text-neutral-500 hover:text-white rounded-[30px] font-black transition-all flex items-center justify-center gap-3 hover:bg-white/[0.08] active:scale-95"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </div>
            )}
        </div>

        {/* SLIDER SECTION (BELOW CARDS) */}
        {resultImage && (
           <div className="mt-40 animate-in fade-in slide-in-from-bottom-20 duration-1000 relative">
              <div className="text-center mb-16 space-y-4">
                <div className="px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black tracking-[1em] uppercase mx-auto w-fit">
                    Optical Analysis
                </div>
                <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase text-white">Invisibility <span className="text-emerald-500">Verification</span></h2>
              </div>
              
              <div className="relative max-w-5xl mx-auto group ring-1 ring-white/10 rounded-[40px] overflow-hidden shadow-3xl bg-neutral-950 aspect-video">
                  {/* BASE IMAGE (CARRIER) */}
                  <img src={selectedImages[0]!} className="absolute inset-0 w-full h-full object-contain p-4" alt="Carrier" />
                  
                  {/* OVERLAY IMAGE (STEGO - CLIPPED) */}
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img src={resultImage} className="absolute inset-0 w-full h-full object-contain p-4 bg-neutral-950" style={{ width: `${100 * (100/(sliderPosition || 0.1))}%` }} alt="Stego" />
                    <div className="absolute top-10 left-10 px-6 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-xl shadow-xl z-30">
                        STEGO LAYER
                    </div>
                  </div>

                  <div className="absolute top-10 right-10 px-6 py-2 bg-white/5 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-xl backdrop-blur-md border border-white/10 z-30 opacity-40">
                        ORIGINAL
                  </div>

                  {/* SLIDER CONTROL */}
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sliderPosition} 
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-50"
                  />

                  {/* HANDLE */}
                  <div className="absolute top-0 bottom-0 z-40 pointer-events-none w-px bg-white/30" style={{ left: `${sliderPosition}%` }}>
                      <div className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'scale-125' : 'scale-100'}`}>
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl" />
                          <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl">
                              <ArrowRightLeft className="text-black w-5 h-5" />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-center mt-12 gap-8 text-neutral-800">
                  <span className="text-[10px] font-black uppercase tracking-[1em]">Mathematical Parity Active</span>
              </div>
           </div>
        )}
      </div>
      <BackgroundBeams className="opacity-40" />
    </div>
  );
}

function ThreeDCardDemo({ index, selectedImage, handleImageChange, imageInfo, title, color, icon }: any) {
  const isEmerald = color === "emerald";
  return (
    <CardContainer className="w-full">
      <CardBody className="bg-neutral-950/60 border border-white/[0.08] relative group/card w-full rounded-[45px] p-10 shadow-3xl backdrop-blur-2xl flex flex-col h-full group">
        <CardItem translateZ="50" className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
          <div className={`p-4 ${isEmerald ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'} rounded-[20px] shadow-inner`}>
            {icon}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.4em] mb-1">Layer 0{index + 1}</span>
            {title}
          </div>
        </CardItem>
        
        <CardItem translateZ="100" className="w-full aspect-square relative rounded-[35px] overflow-hidden bg-neutral-900/50 border-2 border-dashed border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-center cursor-pointer group/upload">
          {selectedImage ? (
            <img src={selectedImage} className="absolute inset-0 w-full h-full object-contain p-6" alt="Preview" />
          ) : (
            <div className="flex flex-col items-center gap-6 text-neutral-700 group-hover/upload:text-emerald-500 transition-colors">
                <ImageIcon size={48} className="opacity-20" />
                <span className="font-black uppercase tracking-[0.5em] text-[10px]">Ingest Media Source</span>
            </div>
          )}
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} accept="image/*" />
        </CardItem>
        
        <div className="mt-12 flex items-center justify-between">
           <div className="flex flex-col gap-1 text-left">
             <span className="text-[9px] text-neutral-700 font-black uppercase tracking-[0.4em]">Bitstream Info</span>
             {imageInfo ? (
               <div className="flex items-center gap-2">
                 <span className={`text-[11px] ${isEmerald ? 'text-emerald-500' : 'text-sky-500'} font-black font-mono px-3 py-1 bg-white/[0.03] rounded-lg border border-white/5`}>
                   {imageInfo.width}×{imageInfo.height}
                 </span>
                 <span className="text-[11px] text-neutral-500 font-black font-mono">
                    {(imageInfo.size/1024).toFixed(0)} KB
                 </span>
               </div>
             ) : (
               <span className="text-[10px] text-neutral-800 font-black italic text-left">Waiting...</span>
             )}
           </div>
           {selectedImage && (
             <div className={`p-2 rounded-full ${isEmerald ? 'bg-emerald-500/20 text-emerald-500' : 'bg-sky-500/20 text-sky-500'} animate-pulse`}>
               <ShieldCheck size={16} />
             </div>
           )}
        </div>
      </CardBody>
    </CardContainer>
  );
}

export default EncryptImage;
