// client/pages/demo/decrypt-image/index.tsx
// src/app/DecryptImage/page.tsx
"use client"; // Add this at the top
import Image from "next/image";
import React, { useState } from "react";
import Swal from "sweetalert2";
import "@sweetalert2/theme-dark/dark.scss";
import { BackgroundBeams } from "../../../components/ui/background-beams";
import { NavbarDemo } from "../nav";
import {
  CardBody,
  CardContainer,
  CardItem,
} from "../../../components/ui/3d-card";

function DecryptImage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decryptedImage, setDecryptedImage] = useState<string | null>(null);

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

  const handleShowImage = async () => {
    try {
      const { value: password } = await Swal.fire({
        title: "Enter your password",
        input: "password",
        inputLabel: "Password",
        inputPlaceholder: "Enter your password",
        inputAttributes: {
          maxlength: "10",
          autocapitalize: "off",
          autocorrect: "off",
        },
      });

      if (!password) {
        Swal.fire({
          title: "Error!",
          text: "Password is required",
          icon: "error",
          confirmButtonText: "Cool",
        });
        return;
      }

      const formData = new FormData();
      formData.append("image", dataURLtoFile(selectedImage!, "image.png"));
      formData.append("password", password);
      const response = await fetch("https://steganoworld-backend.onrender.com/api/decrypt_image", {
        // Updated API endpoint
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const decryptedImageUrl = await response.blob();
        setDecryptedImage(URL.createObjectURL(decryptedImageUrl));

        Swal.fire({
          title: "Decrypted",
          text: "Successfully Decrypt the Image",
          icon: "success",
          confirmButtonText: "Cool",
        });
      } else {
        throw new Error("Failed to decrypt image");
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: `Failed to Decrypt the Image ${error}`,
        icon: "error",
      });
    }
  };

  const handleDownloadImage = () => {
    if (decryptedImage === null) {
      Swal.fire({
        title: "Error!",
        text: "First decrypt the Image",
        icon: "error",
        confirmButtonText: "Cool",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = decryptedImage;
    link.download = "decrypted_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="overflow-hidden pb-10">
      <NavbarDemo />
      <div className="text-center mt-32 text-6xl text-sky-400">
        Decrypt Image
      </div>
      <div className="flex flex-row flex-wrap items-center justify-around">
        <ThreeDCardDemo
          selectedImage={selectedImage}
          handleImageChange={handleImageChange}
          handleShowImage={handleShowImage}
        />
        <ThreeDCardDemo2
          decryptedImage={decryptedImage}
          handleDownloadImage={handleDownloadImage}
        />
      </div>
      <BackgroundBeams />
    </div>
  );
}

function ThreeDCardDemo({
  selectedImage,
  handleImageChange,
  handleShowImage,
}: {
  selectedImage: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleShowImage: () => void;
}) {
  return (
    <CardContainer className="inter-var mb-20">
      <CardBody className="bg-gray-50 relative group/card dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
        <CardItem
          translateZ="50"
          className="text-xl font-bold text-neutral-600 dark:text-white">
          Select Image
        </CardItem>
        <CardItem
          as="p"
          translateZ="60"
          className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
          Please select the image for Decryption
        </CardItem>
        <CardItem translateZ="100" className="w-full mt-4">
          {selectedImage ? (
            <Image
              src={selectedImage}
              height="800"
              width="1000"
              className="h-full mt-8 mb-8 w-full object-cover rounded-xl group-hover/card:shadow-xl"
              alt="Decrypted Image"
            />
          ) : (
            <div className="h-60 w-full flex items-center justify-center text-gray-400">
              No image selected
            </div>
          )}
        </CardItem>
        <div className="cursor-pointer flex justify-between items-center mt-20">
          <label
            htmlFor="imageUpload"
            className="cursor-pointer relative inline-flex h-12 overflow-hidden rounded-full p-[1px]">
            <input
              type="file"
              id="imageUpload"
              className="cursor-pointer absolute inset-0 opacity-0"
              onChange={handleImageChange}
            />
            <span className="cursor-pointer absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              Browse Image
            </span>
          </label>
          <button
            className="cursor-pointer relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
            onClick={handleShowImage} // Add onClick event handler
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              Show Image
            </span>
          </button>
        </div>
      </CardBody>
    </CardContainer>
  );
}

function ThreeDCardDemo2({
  decryptedImage,
  handleDownloadImage,
}: {
  decryptedImage: string | null;
  handleDownloadImage: () => void;
}) {
  return (
    <CardContainer className="inter-var mb-20">
      <CardBody className="bg-gray-50 relative group/card dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
        <CardItem
          translateZ="50"
          className="text-xl font-bold text-neutral-600 dark:text-white">
          Decrypted Image
        </CardItem>
        <CardItem translateZ="100" className="w-full mt-4">
          {decryptedImage ? (
            <Image
              src={decryptedImage}
              height="800"
              width="1000"
              className="h-full mt-8 mb-8 w-full object-cover rounded-xl group-hover/card:shadow-xl"
              alt="Decrypted Image 2"
            />
          ) : (
            <div className="h-60 w-full flex items-center justify-center text-gray-400">
              No decrypted image available
            </div>
          )}
        </CardItem>
        <div className="cursor-pointer flex justify-center items-center mt-20">
          <label
            htmlFor="imageDownload"
            className="cursor-pointer relative inline-flex h-12 overflow-hidden rounded-full p-[1px]">
            <input
              type="file"
              id="imageDownload"
              className="cursor-pointer absolute inset-0 opacity-0"
              onClick={handleDownloadImage}
            />
            <span className="cursor-pointer absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className=" inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              Download Image
            </span>
          </label>
        </div>
      </CardBody>
    </CardContainer>
  );
}

export default DecryptImage;
