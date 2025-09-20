import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Minus, X } from "lucide-react";

interface VotingToastProps {
  isVisible: boolean;
  voteType: "for" | "against" | "abstain";
  votingPower: number;
  onClose: () => void;
}

export default function VotingToast({ isVisible, voteType, votingPower, onClose }: VotingToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getVoteConfig = () => {
    switch (voteType) {
      case "for":
        return {
          icon: CheckCircle,
          text: "Voted FOR",
          color: "text-teal-400",
          bgColor: "bg-teal-500/20",
          borderColor: "border-teal-500/30",
          glowColor: "neon-glow-teal"
        };
      case "against":
        return {
          icon: XCircle,
          text: "Voted AGAINST",
          color: "text-red-400",
          bgColor: "bg-red-500/20",
          borderColor: "border-red-500/30",
          glowColor: "neon-glow-red"
        };
      case "abstain":
        return {
          icon: Minus,
          text: "Abstained",
          color: "text-gray-400",
          bgColor: "bg-gray-500/20",
          borderColor: "border-gray-500/30",
          glowColor: "neon-glow-silver"
        };
    }
  };

  const config = getVoteConfig();
  const IconComponent = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card 
        className={`glass-morphism ${config.bgColor} ${config.borderColor} ${config.glowColor} transition-all duration-500 ${
          isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <IconComponent className={`w-6 h-6 ${config.color}`} />
            <div className="flex-1">
              <div className={`font-semibold ${config.color}`}>
                {config.text}
              </div>
              <div className="text-sm text-gray-300">
                with VP {votingPower.toLocaleString()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
