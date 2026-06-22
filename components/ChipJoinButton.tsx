"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { joinChipCupAction } from "@/app/actions/chip-cup";
import { t } from "@/lib/i18n";

/** Opt into the Chip Cup and reveal the wager board. */
export default function ChipJoinButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function join() {
    setError("");
    startTransition(async () => {
      const res = await joinChipCupAction();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={join}
        disabled={pending}
        className="btn btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
      >
        <Coins className="h-5 w-5" aria-hidden />
        {t.chipCup.join}
      </button>
      {error && (
        <p className="text-center text-xs font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}
