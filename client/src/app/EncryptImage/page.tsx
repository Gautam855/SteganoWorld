// client/pages/demo/encrypt-image/index.tsx
"use client";
import Image from "next/image";
import React, { useState } from "react";
import { CardBody, CardContainer, CardItem } from "../../../components/ui/3d-card";
import { BackgroundBeams } from "../../../components/ui/background-beams";
import { NavbarDemo } from "../nav";
import Swal from 'sweetalert2';

// Interface to store image information
interface ImageInfo {
  size: number;
  width: number;
  height: number;
}

function EncryptImage() {
  // State to store the selected images
  const [selectedImages, setSelectedImages] = useState<(string | null)[]>([null, null]);
  const [imageInfo, setImageInfo] = useState<(ImageInfo | null)[]>([null, null]);

  // Function to handle image selection
  const handleImageChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newSelectedImages = [...selectedImages];
        newSelectedImages[index] = reader.result as string;
        setSelectedImages(newSelectedImages);

        // Create a new Image object to read its dimensions
        const img = new window.Image();
        img.onload = () => {
          const newImageInfo = [...imageInfo];
          newImageInfo[index] = { size: file.size, width: img.width, height: img.height };
          setImageInfo(newImageInfo);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to send images to the backend
  const handleHideClick = async () => {
    if (imageInfo[0] && imageInfo[1] && imageInfo[1].size > imageInfo[0].size) {
      Swal.fire({
        title: 'Error',
        text: 'Image 1 size Should be Greater than Image 1',
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
    selectedImages.forEach((image, index) => {
      if (image) {
        formData.append(`image${index + 1}`, dataURLtoFile(image, `image${index + 1}.png`));
      }
    });
    formData.append('password', password);
    const process_request = await fetch("https://steganoworld-backend.onrender.com/api/encrypt_images", { // Updated API endpoint
      method: "POST",
      body: formData,
    });

    if (process_request.ok) {
      const blob = await process_request.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "encrypted_image.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      Swal.fire({
        title: 'Success',
        text: 'Image Encrypted and Downloaded Successfully',
        icon: 'success',
        confirmButtonText: 'Cool'
      });
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Failed to send image',
        icon: 'error',
        confirmButtonText: 'Cool'
      });
    }
  };

  // Helper function to convert data URL to file
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

  return (
    <div>
      <NavbarDemo />
      <div className="text-center mt-32 text-6xl text-sky-400">Encrypt Image</div>
      <div className="flex flex-row flex-wrap items-center justify-around">
        <ThreeDCardDemo index={0} selectedImage={selectedImages[0]} handleImageChange={handleImageChange(0)} imageInfo={imageInfo[0]} />
        <ThreeDCardDemo index={1} selectedImage={selectedImages[1]} handleImageChange={handleImageChange(1)} handleHideClick={handleHideClick} imageInfo={imageInfo[1]} />
      </div>
      <BackgroundBeams />
    </div>
  );
}

interface ThreeDCardDemoProps {
  index: number;
  selectedImage: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleHideClick?: () => void; // Make handleHideClick optional
  imageInfo: ImageInfo | null; // Add imageInfo prop
}

function ThreeDCardDemo({ index, selectedImage, handleImageChange, handleHideClick, imageInfo }: ThreeDCardDemoProps) {
  return (
    <CardContainer className="inter-var mb-40">
      <CardBody className="bg-gray-50 relative group/card dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
        <CardItem translateZ="50" className="text-xl font-bold text-neutral-600 dark:text-white">
          Select Image {index + 1}
        </CardItem>
        <CardItem translateZ="60" className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
          Please select the image for Encryption
        </CardItem>
        <CardItem translateZ="100" className="w-full mt-4">
          {selectedImage ? (
            <>
              <Image
                src={selectedImage}
                height="800"
                width="1000"
                className="h-full mt-8 mb-8 w-full object-cover rounded-xl group-hover/card:shadow-xl"
                alt={`Decrypted Image ${index + 1}`}
              />
              {imageInfo && (
                <div className="text-neutral-500 text-sm mt-2 dark:text-neutral-300">
                  Size: {(imageInfo.size / 1024).toFixed(2)} KB <br />
                  Dimensions: {imageInfo.width}x{imageInfo.height}
                </div>
              )}
            </>
          ) : (
            <div className="h-60 w-full flex items-center justify-center text-gray-400">No image selected</div>
          )}
        </CardItem>
        <div className="flex justify-between items-center mt-20">
          <CardItem translateZ={20} className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white">
            Try now →
          </CardItem>
          {index === 1 && handleHideClick && ( // Check if handleHideClick is defined and index is 1
            <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" onClick={handleHideClick}>
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                Encrypt Image
              </span>
            </button>
          )}
          <label htmlFor={`imageUpload${index + 1}`} className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px]">
            <input type="file" id={`imageUpload${index + 1}`} className="absolute inset-0 opacity-0" onChange={handleImageChange} />
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">Browse Image</span>
          </label>
        </div>
      </CardBody>
    </CardContainer>
  );
}

export default EncryptImage;
