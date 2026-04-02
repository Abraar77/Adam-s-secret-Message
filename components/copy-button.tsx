"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CheckIcon, ClipboardIcon } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      className="flex items-center gap-2"
    >
      {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
