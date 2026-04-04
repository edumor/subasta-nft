"use client";

import { useEffect, useState } from "react";

interface Props {
  endTime: bigint;
  onExpire?: () => void;
}

export function CountdownTimer({ endTime, onExpire }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(endTime) - now;
      setRemaining(Math.max(0, diff));
      if (diff <= 0) onExpire?.();
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, onExpire]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const isUrgent = remaining > 0 && remaining < 600; // < 10 min

  return (
    <div className="flex items-center gap-2">
      {remaining === 0 ? (
        <span className="text-slate-400 text-sm">Auction ended</span>
      ) : (
        <>
          <TimeUnit value={hours} label="h" urgent={isUrgent} />
          <span className={`text-lg font-mono ${isUrgent ? "text-red-400" : "text-slate-400"}`}>:</span>
          <TimeUnit value={minutes} label="m" urgent={isUrgent} />
          <span className={`text-lg font-mono ${isUrgent ? "text-red-400" : "text-slate-400"}`}>:</span>
          <TimeUnit value={seconds} label="s" urgent={isUrgent} />
        </>
      )}
    </div>
  );
}

function TimeUnit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-lg px-3 py-2 min-w-[52px] ${
      urgent ? "bg-red-500/10 border border-red-500/30" : "bg-slate-800 border border-slate-700"
    }`}>
      <span className={`text-2xl font-mono font-bold ${urgent ? "text-red-400" : "text-white"}`}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
