import { motion } from "framer-motion";
import { Terminal as TerminalIcon, ChevronRight } from "lucide-react";

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  status: "calling" | "success" | "error";
  result?: any;
}

interface ToolCallStreamProps {
  calls: ToolCall[];
}

export function ToolCallStream({ calls }: ToolCallStreamProps) {
  if (calls.length === 0) return null;

  return (
    <div className="my-4 space-y-2 font-mono">
      {calls.map((call) => (
        <motion.div
          key={call.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-3 rounded border text-xs flex flex-col gap-2 ${
            call.status === "error" ? "bg-red-500/5 border-red-500/30" : "bg-cyan-500/5 border-cyan-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <TerminalIcon size={14} className={call.status === "error" ? "text-red-400" : "text-cyan-400"} />
            <span className="font-bold text-gray-400 uppercase tracking-tighter">Executing Tool:</span>
            <span className={call.status === "error" ? "text-red-400" : "text-cyan-300"}>{call.name}</span>
            {call.status === "calling" && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-1.5 h-3 bg-cyan-400 ml-1"
              />
            )}
          </div>
          
          <div className="bg-black/40 p-2 rounded text-[10px] text-gray-500 overflow-x-auto whitespace-pre">
            {JSON.stringify(call.args, null, 2)}
          </div>

          {call.result && (
            <div className="border-t border-cyan-500/10 pt-2 mt-1">
              <div className="flex items-center gap-1 mb-1">
                <ChevronRight size={10} className="text-gray-600" />
                <span className="text-[10px] text-gray-600 uppercase">Result:</span>
              </div>
              <div className="text-[10px] text-gray-400 max-h-24 overflow-y-auto custom-scrollbar">
                {typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2)}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
