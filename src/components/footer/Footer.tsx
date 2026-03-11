import React from "react";
import { useAppVersion } from "@/hooks/useAppVersion";

import ModelSelector from "../model-selector";
import UpdateChecker from "../update-checker";

const Footer: React.FC = () => {
  const version = useAppVersion();

  return (
    <div className="w-full border-t border-glass-border bg-glass-bg pt-2">
      <div className="flex justify-between items-center text-xs px-4 pb-2 text-text/70">
        <div className="flex items-center gap-4">
          <ModelSelector />
        </div>

        {/* Update Status */}
        <div className="flex items-center gap-1">
          <UpdateChecker />
          <span>•</span>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span>v{version}</span>
        </div>
      </div>
    </div>
  );
};

export default Footer;
