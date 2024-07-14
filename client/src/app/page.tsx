
"use client";
import React, { useState, useEffect } from "react";
import { TextGenerateEffect } from "../../components/ui/text-generate-effect";
import { WavyBackground } from "../../components/ui/wavy-background";
import { cn } from "../../utils/cn";
import {NavbarDemo} from "../app/nav";

const words = `Steganography is the art and science of hiding information within other seemingly innocuous data. Unlike cryptography, which focuses on making data unreadable to unauthorized users, steganography aims to conceal the very existence of the data. This subtle approach can be particularly effective in today's digital world, where information security is paramount.
`;
function Hello() {
  useEffect(() => {
    // Any additional setup can be done here
  }, []);

  return (
    <div> 
      <WavyBackgroundDemo />
      <NavbarDemo />
    </div>
  );
}

function WavyBackgroundDemo() {
  return (
    <WavyBackground className="max-w-4xl mx-auto pb-40">
      <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var text-center">
        StegoWorld
      </p>
      <TextGenerateEffect words={words} />
    </WavyBackground>
  );
}

export default Hello;