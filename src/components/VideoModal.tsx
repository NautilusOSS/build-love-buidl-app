import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";
import { TARGET_AIRDROP_ID } from "./AccountAirdrop";

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl?: string;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({
  open,
  onClose,
  videoUrl = `https://nautilusoss.github.io/airdrop/data/${TARGET_AIRDROP_ID}.mp4`,
  title = "Welcome to POW!",
  description = "Learn more about the POW token and how to get started.",
  actionText = "Get Started",
  onAction,
}) => {
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (open && videoRef) {
      videoRef.play().catch((error) => {
        console.log("Video autoplay failed:", error);
      });
    }
  }, [open, videoRef]);

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] sm:w-[95vw] md:w-[90vw] max-h-[95vh] p-0 overflow-hidden bg-black backdrop-blur-sm">
        <div className="relative">
          {/* Video Container */}
          <div className="relative w-full h-0 pb-[56.25%] bg-black">
            <video
              ref={setVideoRef}
              className="absolute top-0 left-0 w-full h-full object-contain"
              playsInline
              controls
              muted
              loop
              preload="metadata"
              poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMDAwIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjI1IiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxvYWRpbmcgVmlkZW8uLi48L3RleHQ+Cjwvc3ZnPgo="
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 md:p-8 text-center">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                {description}
              </DialogDescription>
            </DialogHeader>

            <Button
              onClick={handleAction}
              className="bg-gradient-to-r from-[#1eaedb] to-[#0a4d62] hover:from-[#0d6179] hover:to-[#0a4d62] text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-sm sm:text-base"
            >
              {actionText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
