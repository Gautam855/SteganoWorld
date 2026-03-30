
"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "../../utils/cn";

const transition = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: any) => void;
  active: any;
  item: React.ReactNode;
  children?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative ">
      <motion.div
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-black hover:opacity-[0.9] dark:text-white flex items-center gap-2"
      >
        {item}
      </motion.div>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-4">
              <motion.div
                transition={transition}
                layoutId="active" // layoutId ensures smooth animation
                className="bg-white dark:bg-[#0a0a0a] backdrop-blur-md rounded-2xl overflow-hidden border border-black/[0.2] dark:border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <motion.div
                  layout // layout ensures smooth animation
                  className="w-max h-full p-6"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)} // resets the state
      className="relative rounded-full border border-transparent dark:bg-black/50 dark:border-white/[0.2] bg-white shadow-input flex justify-around space-x-8 px-12 py-8 "
    >
      {children}
    </nav>
  );
};


export const HoveredLink = ({ children, className, ...rest }: any) => {
  return (
    <Link
      {...rest}
      className={cn(
        "text-neutral-700 dark:text-neutral-200 hover:text-sky-500 transition-colors",
        className
      )}
    >
      {children}
    </Link>
  );
};