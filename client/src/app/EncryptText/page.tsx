"use client";
import React, { useState } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import Image from "next/image";
import { CardBody, CardContainer, CardItem } from "../../../components/ui/3d-card";
import { BackgroundBeams } from "../../../components/ui/background-beams";
import { NavbarDemo } from "../nav";
import { API_BASE_URL } from "../../utils/constants";
import { SteganoProgress } from "../../../components/ui/stegano-progress";
import { Loader2, ShieldCheck, ImageIcon, Send, History, FlaskConical, Download, RefreshCcw, ArrowRightLeft, MessageSquareQuote } from "lucide-react";

const EncryptText = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textData, setTextData] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleHideClick = async () => {
    if (!selectedImage) {
      Swal.fire({ title: 'Image Required', text: 'Select a cover image.', icon: 'warning', confirmButtonColor: '#10b981' });
      return;
    }
    if (!textData) {
      Swal.fire({ title: 'Message Required', text: 'Enter a secret message.', icon: 'warning', confirmButtonColor: '#10b981' });
      return;
    }

    const { value: password } = await Swal.fire({
      title: "Secure Your Message",
      input: "password",
      inputLabel: "Decryption Password",
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      background: '#0a0a0a',
      color: '#fff',
    });

    if (password === undefined) return;
    if (!password) {
      Swal.fire({ title: 'Password Required', text: 'A password is needed.', icon: 'error', confirmButtonColor: '#ef4444' });
      return;
    }

    setLoading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append("image", dataURLtoFile(selectedImage, "image.png"));
    formData.append("text", textData);
    formData.append("password", password);

    try {
      const response = await axios.post(`${API_BASE_URL}/encrypt_text`, formData, {
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
        title: 'Mission Success!', 
        text: 'Your secret is now woven into the pixels. Analysis lab active.', 
        icon: 'success', 
        confirmButtonColor: '#10b981',
        background: '#0a0a0a',
        color: '#fff',
        timer: 1500
      });
    } catch (error: any) {
      Swal.fire({ title: 'Encryption Failed', text: 'An error occurred while hiding your message.', icon: 'error', confirmButtonColor: '#ef4444' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDemoClick = () => {
    if (!selectedImage) {
      Swal.fire({ title: "Select Carrier First", text: "Please select an image to preview the lab.", icon: "info", confirmButtonColor: '#10b981' });
      return;
    }
    setResultImage(selectedImage);
    Swal.fire({ title: "Analysis Active", icon: "success", timer: 1000, showConfirmButton: false });
  };

  const handleDownloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "stego_message_locked.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { 
          setSelectedImage(reader.result as string); 
          setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
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
      <NavbarDemo/>
      <SteganoProgress isVisible={loading} progress={progress} statusText="Embedding encrypted payload..." />
      
      <div className="relative z-10 container mx-auto pt-48 max-w-7xl">
        <div className="text-center mb-24 space-y-6">
            <h1 className="text-5xl md:text-[6rem] font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-600 tracking-tighter leading-[0.8] uppercase">
                Text <span className="text-emerald-500 italic">Shadowing</span>
            </h1>
            <p className="text-neutral-500 text-xl font-medium">Bury classified metadata within optical carrier streams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 px-4">
            {[ 
                { icon: <ImageIcon size={24} className="text-emerald-500" />, title: "Host Carrier", desc: "Select a normal image to act as the encryption host." },
                { icon: <MessageSquareQuote size={24} className="text-sky-500" />, title: "Message Stream", desc: "Enter the classified text data to be shadowed." },
                { icon: <FlaskConical size={24} className="text-amber-500" />, title: "Bit Weaving", desc: "Encoded and buried deep in the sub-pixel noise." }
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
            <CardContainer className="w-full">
                <CardBody className="bg-neutral-950/60 border border-white/[0.08] relative group/card w-full rounded-[45px] p-10 shadow-3xl backdrop-blur-2xl flex flex-col h-full">
                  <CardItem translateZ="50" className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
                    <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-[20px] shadow-inner">
                      <ImageIcon />
                    </div>
                    CARRIER SOURCE
                  </CardItem>
                  <CardItem translateZ="100" className="w-full flex-grow aspect-video relative rounded-[35px] overflow-hidden bg-neutral-900/50 border-2 border-dashed border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-center cursor-pointer group/upload">
                    {selectedImage ? (
                      <img src={selectedImage} className="absolute inset-0 w-full h-full object-contain p-6" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-6 text-neutral-700 group-hover/upload:text-emerald-500 transition-colors">
                          <ImageIcon size={48} className="opacity-20" />
                          <span className="font-black uppercase tracking-[0.5em] text-[10px]">Import Cover Media</span>
                      </div>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} accept="image/*" />
                  </CardItem>
                </CardBody>
             </CardContainer>

             <CardContainer className="w-full">
                <CardBody className="bg-neutral-950/60 border border-white/[0.08] relative group/card w-full rounded-[45px] p-10 shadow-3xl backdrop-blur-2xl flex flex-col h-full">
                  <CardItem translateZ="50" className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
                    <div className="p-4 bg-sky-500/10 text-sky-500 rounded-[20px] shadow-inner">
                      <MessageSquareQuote />
                    </div>
                    MESSAGE PAYLOAD
                  </CardItem>
                  <div className="space-y-4 flex flex-grow flex-col">
                    <textarea 
                        className="flex-grow min-h-[200px] w-full bg-black/40 backdrop-blur-md p-8 rounded-[35px] border border-white/10 outline-none focus:border-sky-500/50 transition-all text-neutral-300 font-mono text-sm leading-relaxed shadow-inner" 
                        placeholder="Type secret transmission here..." 
                        onChange={(e) => setTextData(e.target.value)} 
                    />
                  </div>
                </CardBody>
             </CardContainer>
        </div>

        <div className="flex flex-col items-center gap-10 mt-12">
            {!resultImage ? (
                <>
                    <button 
                        onClick={handleHideClick} 
                        disabled={loading} 
                        className="h-20 w-full max-w-2xl bg-white text-black rounded-[30px] font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Send size={24} />} EXECUTE PROTOCOL
                    </button>
                    <button onClick={handleDemoClick} className="group flex items-center gap-2 text-neutral-600 hover:text-white transition-all text-[10px] uppercase font-black tracking-[0.5em] opacity-40 hover:opacity-100">
                        <History size={14} /> Open Analysis Lab
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
                        onClick={() => {setSelectedImage(null); setResultImage(null); setTextData("");}} 
                        className="flex-1 h-20 bg-white/[0.05] border border-white/10 text-neutral-500 hover:text-white rounded-[30px] font-black transition-all flex items-center justify-center gap-3 hover:bg-white/[0.08] active:scale-95"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </div>
            )}
        </div>

        {/* SLIDER SECTION */}
        {resultImage && (
           <div className="mt-40 animate-in fade-in slide-in-from-bottom-20 duration-1000 relative">
              <div className="text-center mb-16 space-y-4">
                <div className="px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black tracking-[1em] uppercase mx-auto w-fit">
                    Optical Analysis
                </div>
                <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase text-white">Full <span className="text-emerald-500">Overlay</span> Comparison</h2>
              </div>
              
              <div className="relative max-w-5xl mx-auto group ring-1 ring-white/10 rounded-[40px] overflow-hidden shadow-3xl bg-neutral-950 aspect-video">
                  <img src={selectedImage!} className="absolute inset-0 w-full h-full object-contain p-4" alt="Carrier" />
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img src={resultImage} className="absolute inset-0 w-full h-full object-contain p-4 bg-neutral-950" style={{ width: `${100 * (100/(sliderPosition || 0.1))}%` }} alt="Stego" />
                    <div className="absolute top-10 left-10 px-6 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-xl shadow-xl z-30">
                        TEXT-SHADOWED
                    </div>
                  </div>
                  <div className="absolute top-10 right-10 px-6 py-2 bg-white/5 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-xl backdrop-blur-md border border-white/10 z-30 opacity-40">
                        ORIGINAL
                  </div>
                  <input type="range" min="0" max="100" value={sliderPosition} onChange={(e) => setSliderPosition(Number(e.target.value))} onMouseDown={() => setIsDragging(true)} onMouseUp={() => setIsDragging(false)} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-50" />
                  <div className="absolute top-0 bottom-0 z-40 pointer-events-none w-px bg-white/30" style={{ left: `${sliderPosition}%` }}>
                      <div className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'scale-125' : 'scale-100'}`}>
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl" />
                          <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl">
                              <ArrowRightLeft className="text-black w-5 h-5" />
                          </div>
                      </div>
                  </div>
              </div>
           </div>
        )}
      </div>
      <BackgroundBeams className="opacity-40" />
    </div>
  );
};

export default EncryptText;
