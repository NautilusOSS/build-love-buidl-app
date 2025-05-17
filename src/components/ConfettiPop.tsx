
import React, { useEffect, useRef } from "react";
import { Star, Award } from "lucide-react";

type ConfettiPopProps = {
  badge: string;
  onDone?: () => void;
};

const ConfettiPop: React.FC<ConfettiPopProps> = ({ badge, onDone }) => {
  // Very lightweight "confetti": floating circles/stars.
  // For a real app you'd want a package; here it's simple SVG+CSS for demo.
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Auto-dismiss after 2.5s
    timeoutRef.current = setTimeout(() => {
      onDone?.();
    }, 2500);
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-[#221F26]/90 rounded-2xl px-8 py-7 shadow-2xl border border-white/10 glass-morphism flex flex-col items-center animate-scale-in">
        <span className="absolute left-2 top-2 animate-pulse">
          <Star color="#D946EF" size={32} />
        </span>
        <Award color="#8B5CF6" size={64} className="mb-2 drop-shadow-xl animate-bounce" />
        <div className="font-extrabold text-2xl text-gradient mb-2">{badge}</div>
        <div className="text-lg font-semibold text-white mb-1">You’ve been BUIDL’d!</div>
        <div className="text-base text-[#9b87f5]">Congrats! Your work powers the community 🚀</div>
        <span className="absolute right-2 bottom-2 animate-pulse delay-75">
          <Star color="#1EAEDB" size={28} />
        </span>
      </div>
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className={`absolute rounded-full`}
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              width: `${10 + Math.random() * 18}px`,
              height: `${10 + Math.random() * 18}px`,
              background: ["#9b87f5", "#1EAEDB", "#D946EF", "#FFF"].sort(() => 0.5 - Math.random())[0],
              opacity: 0.73 + Math.random() * 0.25,
              filter: "blur(0.5px)",
              animation: `confetti-float 1.4s cubic-bezier(.22,1,.36,1) ${i * 0.11}s both`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ConfettiPop;
