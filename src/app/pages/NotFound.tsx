import { TrendingUp, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useCopy } from "../lib/copy";

export default function NotFound() {
  const navigate = useNavigate();
  const copy = useCopy();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="rounded-[32px] backdrop-blur-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.06] border border-white/20 p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] max-w-md mx-auto">
          <div className="p-4 rounded-full bg-gradient-to-br from-[#f97316] to-[#ef4444] shadow-[0_0_24px_rgba(249,115,22,0.4)] w-fit mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-6xl font-bold bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#3b82f6] bg-clip-text text-transparent mb-4">
            404
          </h1>

          <h2 className="text-2xl font-semibold text-white/95 mb-3">
            {copy.pageNotFound}
          </h2>

          <p className="text-white/60 mb-8">{copy.pageNotFoundText}</p>

          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] text-sm font-medium text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] transition-all mx-auto"
          >
            <TrendingUp className="w-4 h-4" />
            {copy.backToDashboard}
          </button>
        </div>
      </div>
    </div>
  );
}
