"use client";
import React, { useState } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import Image from "next/image";
import { BackgroundBeams } from "../../../components/ui/background-beams";
import { NavbarDemo } from "../nav";
import { CardBody, CardContainer, CardItem } from "../../../components/ui/3d-card";
import { API_BASE_URL } from "../../utils/constants";
import { SteganoProgress } from "../../../components/ui/stegano-progress";
import { Loader2, KeyRound, ImageIcon, Eye, History, RefreshCcw, MessageSquareQuote, CheckCircle2, Copy } from "lucide-react";

function DecryptText() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setDecryptedText(null);
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReveal = async () => {
    if (!selectedImage) {
      Swal.fire({ title: "Source Missing", text: "Select the stego-encoded carrier.", icon: "warning", confirmButtonColor: '#10b981' });
      return;
    }

    const { value: password } = await Swal.fire({
      title: "Authorization Required",
      input: "password",
      inputLabel: "Decryption Password",
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      background: '#0a0a0a',
      color: '#fff',
    });

    if (password === undefined) return;
    if (!password) {
      Swal.fire({ title: "Access Denied", text: "Password is required for extraction.", icon: "error", confirmButtonColor: '#ef4444' });
      return;
    }

    setLoading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append("image", dataURLtoFile(selectedImage, "image.png"));
    formData.append("password", password);

    try {
      const response = await axios.post(`${API_BASE_URL}/decrypt_text`, formData);
      setDecryptedText(response.data.text);
      
      Swal.fire({ 
        title: "Payload Recovered", 
        text: "Hidden text stream has been successfully reconstructed.", 
        icon: "success", 
        confirmButtonColor: '#10b981',
        background: '#0a0a0a',
        color: '#fff',
        timer: 1500
      });
    } catch (error: any) {
      Swal.fire({ title: "Extraction Failed", text: "Invalid bitstream key or corrupted payload.", icon: "error", confirmButtonColor: '#ef4444' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleCopy = () => {
    if (!decryptedText) return;
    navigator.clipboard.writeText(decryptedText);
    Swal.fire({ title: "Copied", text: "Payload copied to clipboard.", icon: "success", timer: 1000, showConfirmButton: false });
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
      <SteganoProgress isVisible={loading} progress={progress} statusText={progress < 100 ? "Scanning bit-layers for discrepancies..." : "Reconstructing hidden packets..."} />
      
      <div className="relative z-10 container mx-auto pt-48 max-w-7xl">
        <div className="text-center mb-24 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-sky-500 mb-4">
                Decryption Protocol Active
            </div>
            <h1 className="text-5xl md:text-[6rem] font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-600 tracking-tighter leading-[0.8] uppercase">
                Text <span className="text-sky-500 italic">Extraction</span>
            </h1>
            <p className="text-neutral-500 text-xl max-w-2xl mx-auto font-medium">Recover classified text packets from protected bitstreams. <br/> Total accuracy. Instant recovery.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 px-4">
            {[ 
                { icon: <ImageIcon size={24} className="text-sky-500" />, title: "Input Carrier", desc: "Select the PNG containing shadowed text data." },
                { icon: <KeyRound size={24} className="text-emerald-500" />, title: "Bit Hash", desc: "Provide the AES key used for rotation." },
                { icon: <CheckCircle2 size={24} className="text-amber-500" />, title: "Reconstruct", desc: "View the revealed message in the extraction hub." }
            ].map((step, idx) => (
                <div key={idx} className="flex gap-6 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                    <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all h-fit">
                        {step.icon}
                    </div>
                    <div>
                        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-1 opacity-80">ST-0{idx + 1}. {step.title}</h3>
                        <p className="text-xs text-neutral-500 leading-relaxed font-medium">{step.desc}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch mb-24">
           {/* Card 1: Input */}
           <CardContainer className="w-full">
                <CardBody className="bg-neutral-950/60 border border-white/[0.08] relative group/card w-full rounded-[45px] p-10 shadow-3xl backdrop-blur-2xl flex flex-col h-full">
                  <CardItem translateZ="50" className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
                    <div className="p-4 bg-sky-500/10 text-sky-500 rounded-[20px] shadow-inner">
                      <ImageIcon />
                    </div>
                    STEGO SOURCE
                  </CardItem>
                  
                  <CardItem translateZ="100" className="w-full aspect-square relative rounded-[35px] overflow-hidden bg-neutral-900/50 border-2 border-dashed border-white/5 hover:border-sky-500/30 transition-all flex items-center justify-center cursor-pointer group/upload">
                    {selectedImage ? (
                      <img src={selectedImage} className="absolute inset-0 w-full h-full object-contain p-6" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-6 text-neutral-700 group-hover/upload:text-sky-500 transition-colors">
                          <ImageIcon size={48} className="opacity-20" />
                          <span className="font-black uppercase tracking-[0.5em] text-[10px]">Import Stego Blob</span>
                      </div>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} accept="image/*" />
                  </CardItem>

                  <button 
                      onClick={handleReveal} 
                      disabled={loading || !selectedImage} 
                      className="mt-12 h-20 w-full bg-white text-black rounded-[30px] font-black text-xl hover:scale-[1.02] active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-4 shadow-2xl"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Eye size={24} />} RECONSTRUCT TEXT
                  </button>
                </CardBody>
           </CardContainer>

           {/* Card 2: Output */}
           <CardContainer className="w-full">
                <CardBody className="bg-neutral-950/60 border border-white/[0.08] relative group/card w-full rounded-[45px] p-10 shadow-3xl backdrop-blur-2xl flex flex-col h-full">
                  <CardItem translateZ="50" className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
                    <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-[20px] shadow-inner">
                      <MessageSquareQuote />
                    </div>
                    REVEALED PAYLOAD
                  </CardItem>
                  
                  <CardItem translateZ="100" className="w-full flex-grow aspect-square relative rounded-[35px] overflow-hidden bg-black/40 border border-white/5 flex flex-col items-center justify-center group/result">
                    {decryptedText ? (
                        <div className="relative w-full h-full p-6 animate-in fade-in zoom-in-95 duration-500">
                                <textarea 
                                    readOnly
                                    value={decryptedText}
                                    className="h-full w-full bg-transparent p-4 outline-none text-emerald-200 font-mono text-sm leading-relaxed"
                                />
                                <div className="absolute top-6 right-6 flex gap-2">
                                    <button onClick={handleCopy} className="p-4 bg-emerald-500 text-white rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-xl shadow-emerald-500/20">
                                        <Copy size={20} />
                                    </button>
                                </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-10 gap-4">
                            <History size={100} />
                            <span className="font-black uppercase tracking-widest text-[10px]">Awaiting Key Hash</span>
                        </div>
                    )}
                  </CardItem>

                  <div className="mt-12 flex gap-4">
                    <button 
                        onClick={handleCopy} 
                        disabled={!decryptedText}
                        className="flex-[2] h-20 bg-emerald-500 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20"
                    >
                        <Copy /> Copy Result
                    </button>
                    <button 
                        onClick={() => {setSelectedImage(null); setDecryptedText(null);}} 
                        className="flex-1 h-20 bg-white/[0.05] border border-white/10 text-neutral-500 hover:text-white rounded-[30px] font-black transition-all flex items-center justify-center gap-3 hover:bg-white/[0.08] active:scale-90"
                    >
                        <RefreshCcw size={20} />
                    </button>
                  </div>
                </CardBody>
           </CardContainer>
        </div>
      </div>
      <BackgroundBeams className="opacity-40" />
    </div>
  );
}

export default DecryptText;
