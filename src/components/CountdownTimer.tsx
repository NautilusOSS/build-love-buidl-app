import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownTimerProps {
  endTime: string; // ISO string or timestamp
  onExpire?: () => void;
}

export default function CountdownTimer({ endTime, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          total: difference
        });
      } else {
        setIsExpired(true);
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        });
        onExpire?.();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  const isUrgent = timeLeft.total < 3600000; // Less than 1 hour
  const isVeryUrgent = timeLeft.total < 1800000; // Less than 30 minutes

  if (isExpired) {
    return (
      <Card className="glass-morphism-silver">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-gray-400" />
            Voting Ended
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Closed
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-morphism ${isUrgent ? 'neon-glow-violet' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-teal-400'}`} />
          Time Remaining
          {isUrgent && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isUrgent ? 'text-red-400' : 'text-gradient'}`}>
              {timeLeft.days}
            </div>
            <div className="text-xs text-gray-400">days</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isUrgent ? 'text-red-400' : 'text-gradient'}`}>
              {timeLeft.hours}
            </div>
            <div className="text-xs text-gray-400">hours</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isUrgent ? 'text-red-400' : 'text-gradient'}`}>
              {timeLeft.minutes}
            </div>
            <div className="text-xs text-gray-400">min</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isUrgent ? 'text-red-400' : 'text-gradient'}`}>
              {timeLeft.seconds}
            </div>
            <div className="text-xs text-gray-400">sec</div>
          </div>
        </div>
        {isUrgent && (
          <div className="mt-3 text-center">
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
              Voting ends soon!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
