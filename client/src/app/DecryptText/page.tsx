// client/pages/demo/decrypt-text/index.tsx
"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { CardBody, CardContainer, CardItem } from "../../../components/ui/3d-card";
import { NavbarDemo } from "../nav";
import { cn } from "../../../utils/cn";
import Swal from 'sweetalert2';
import { BackgroundBeams } from "../../../components/ui/background-beams";
import { Label } from "../../../components/ui/label";

function DecryptText() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string>("");

  useEffect(() => {
    // Any additional setup can be done here
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDecryptClick = async () => {
    if (!selectedImage) {
      Swal.fire({
        title: 'Error!',
        text: 'Select the Image',
        icon: 'error',
        confirmButtonText: 'Cool'
      });
      return;
    }

    const { value: password } = await Swal.fire({
      title: "Enter your password",
      input: "password",
      inputLabel: "Password",
      inputPlaceholder: "Enter your password",
      inputAttributes: {
        maxlength: "10",
        autocapitalize: "off",
        autocorrect: "off"
      }
    });

    if (!password) {
      Swal.fire({
        title: 'Error!',
        text: 'Password is required',
        icon: 'error',
        confirmButtonText: 'Cool'
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", dataURLtoFile(selectedImage, "image.png"));
    formData.append("password", password);
    const response = await fetch("", { // Updated API endpoint
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      setDecryptedText(result.text);
      Swal.fire("Decryption successful", `Decrypted text: <b>${result.text}</b>`, "success");
    } else {
      Swal.fire("Failed to decrypt the image");
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleDownloadTxt = () => {
    if (decryptedText === "") {
      Swal.fire({
        title: 'Error!',
        text: 'First decrypt the data',
        icon: 'error',
        confirmButtonText: 'Cool'
      });
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([decryptedText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "decrypted_text.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="overflow-hidden pb-40">
      <NavbarDemo />
      <div className="text-center mt-32 text-6xl text-sky-400">Decrypt Text</div>
      <div className="flex flex-row items-center justify-around">
        <ThreeDCardDemo selectedImage={selectedImage} handleImageChange={handleImageChange} />
        <SignupFormDemo decryptedText={decryptedText} handleDecryptClick={handleDecryptClick} handleDownloadTxt={handleDownloadTxt} />
      </div>
      <BackgroundBeams />
    </div>
  );
}

interface SignupFormDemoProps {
  decryptedText: string;
  handleDecryptClick: () => void;
  handleDownloadTxt: () => void;
}

function SignupFormDemo({ decryptedText, handleDecryptClick, handleDownloadTxt }: SignupFormDemoProps) {
  return (
    <CardContainer className="inter-var">
      <CardBody className="bg-gray-50 relative group/card dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
        <form className="flex flex-col items-center justify-around">
          <CardItem translateZ="60" className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
            <Label htmlFor="decryptedMessage">
              <CardItem translateZ="50" className="text-xl font-bold text-neutral-600 dark:text-white">
                Your Message
              </CardItem>
            </Label>
            <textarea id="decryptedMessage" className={cn(
              `flex h-100 w-9/12 border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent 
              file:text-sm file:font-medium placeholder:text-neutral-400 dark:placeholder-text-neutral-600 
              focus-visible:outline-none focus-visible:ring-[2px]  focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600
              disabled:cursor-not-allowed disabled:opacity-50
              dark:shadow-[0px_0px_1px_1px_var(--neutral-700)]
              group-hover/input:shadow-none transition duration-400`
            )} value={decryptedText} readOnly placeholder="Your Secret Message will be displayed here" />
          </CardItem>
        </form>
        <div className="flex justify-around items-center">
          <button type="button" onClick={handleDecryptClick} className="cursor-pointer relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              Show Data
            </span>
          </button>

          <button type="button" onClick={handleDownloadTxt} className="cursor-pointer relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              Download in Txt
            </span>
          </button>
        </div>
      </CardBody>
    </CardContainer>
  );
}

const LabelInputContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn("mb-8 space-y-2 w-128", className)}>{children}</div>;
};

interface ThreeDCardDemoProps {
  selectedImage: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ThreeDCardDemo({ selectedImage, handleImageChange }: ThreeDCardDemoProps) {
  return (
    <CardContainer className="inter-var">
      <CardBody className="bg-gray-50 relative group/card dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
        <CardItem translateZ="50" className="text-xl font-bold text-neutral-600 dark:text-white">
          Select Image
        </CardItem>
        <CardItem translateZ="60" className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
          Please select the image for Decryption
        </CardItem>
        <CardItem translateZ="100" className="w-full mt-4">
          {selectedImage ? (
            <Image src={selectedImage} height="800" width="1000" className="h-full mt-8 mb-8 w-full object-cover rounded-xl group-hover/card:shadow-xl" alt="thumbnail" />
          ) : (
            <div className="h-60 w-full flex items-center justify-center text-gray-400">No image selected</div>
          )}
        </CardItem>
        <div className="flex justify-between items-center mt-20">
          <CardItem translateZ={20} className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white">
            Try now →
          </CardItem>
          <label htmlFor="imageUpload" className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px]">
            <input type="file" id="imageUpload" className="cursor-pointer absolute inset-0 opacity-0" onChange={handleImageChange} />
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              Browse Image
            </span>
          </label>
        </div>
      </CardBody>
    </CardContainer>
  );
}

export default DecryptText;
