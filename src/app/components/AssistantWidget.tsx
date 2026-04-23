import { useEffect, useMemo, useRef, useState } from "react";
import { Grip, MessageCircle, SendHorizontal, Sparkles, X } from "lucide-react";
import { chatAssistant, type AssistantMessage } from "../lib/api";

const STORAGE_POS = "treend-assistant-position";
const STORAGE_HIDDEN = "treend-assistant-hidden";

interface WidgetPosition {
  x: number;
  y: number;
}

export default function AssistantWidget() {
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [position, setPosition] = useState<WidgetPosition>({ x: 0, y: 0 });
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu asistente TrendFlow. Te puedo explicar graficas, resumir tendencias y darte una guia rapida del sistema.",
    },
  ]);
  const quickPrompts = [
    "Dame una guia rapida del sistema",
    "Que significa esta grafica?",
    "Resume las tendencias mas fuertes de hoy",
    "Dame ideas de contenido con estas tendencias",
  ];

  const dragState = useRef<{
    dragging: boolean;
    offsetX: number;
    offsetY: number;
  }>({
    dragging: false,
    offsetX: 0,
    offsetY: 0,
  });
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < 768);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    const hidden = localStorage.getItem(STORAGE_HIDDEN) === "1";
    const savedPos = localStorage.getItem(STORAGE_POS);

    setIsHidden(hidden);

    if (window.innerWidth < 768) {
      setIsExpanded(false);
      return;
    }

    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos) as WidgetPosition;
        setPosition(parsed);
        return;
      } catch {
        // ignore parse errors
      }
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    setPosition({
      x: Math.max(16, width - 390),
      y: Math.max(16, height - 520),
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_POS, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HIDDEN, isHidden ? "1" : "0");
  }, [isHidden]);

  useEffect(() => {
    if (!chatBodyRef.current) {
      return;
    }
    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragState.current.dragging) {
        return;
      }

      const nextX = event.clientX - dragState.current.offsetX;
      const nextY = event.clientY - dragState.current.offsetY;
      setPosition({
        x: Math.max(8, Math.min(nextX, window.innerWidth - 340)),
        y: Math.max(8, Math.min(nextY, window.innerHeight - 120)),
      });
    }

    function onUp() {
      dragState.current.dragging = false;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  );

  async function sendConversation(nextMessages: AssistantMessage[]) {
    setIsLoading(true);

    try {
      const result = await chatAssistant(nextMessages);
      setMessages((current) =>
        [...current, { role: "assistant", content: result.reply }].slice(-16),
      );
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `No pude responder: ${error.message}`
              : "No pude responder por ahora.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || isLoading) {
      return;
    }

    const nextMessages: AssistantMessage[] = [
      ...messages,
      { role: "user", content },
    ].slice(-14);

    setMessages(nextMessages);
    setInput("");
    await sendConversation(nextMessages);
  }

  async function sendQuickPrompt(prompt: string) {
    if (isLoading) {
      return;
    }

    const nextMessages: AssistantMessage[] = [
      ...messages,
      { role: "user", content: prompt },
    ].slice(-14);

    setMessages(nextMessages);
    setInput("");
    await sendConversation(nextMessages);
  }

  if (isHidden) {
    return (
      <button
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-[#ec4899] via-[#a855f7] to-[#3b82f6] text-white shadow-[0_0_30px_rgba(168,85,247,0.55)] transition-all hover:scale-105 md:bottom-6 md:right-6 md:h-16 md:w-16"
        onClick={() => setIsHidden(false)}
        type="button"
      >
        <Sparkles className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div
      className="fixed z-40 w-[calc(100vw-24px)] rounded-[24px] border border-white/25 bg-[#131528]/95 shadow-[0_20px_70px_rgba(91,33,182,0.45)] backdrop-blur-2xl md:w-[340px] md:rounded-[26px]"
      style={
        isMobile
          ? { bottom: 12, left: 12 }
          : {
              left: position.x,
              top: position.y,
            }
      }
    >
      <div
        className="flex cursor-default items-center justify-between rounded-t-[24px] border-b border-white/10 bg-gradient-to-r from-[#ec4899]/30 via-[#a855f7]/30 to-[#3b82f6]/30 px-4 py-3 md:cursor-move md:rounded-t-[26px]"
        onMouseDown={(event) => {
          if (isMobile) {
            return;
          }
          dragState.current.dragging = true;
          dragState.current.offsetX = event.clientX - position.x;
          dragState.current.offsetY = event.clientY - position.y;
        }}
      >
        <div className="flex items-center gap-2 text-white/95">
          <div className="rounded-xl bg-white/15 p-1.5">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">TrendFlow AI</div>
          <Grip className="h-4 w-4 text-white/60" />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/85"
            onClick={() => setIsExpanded((value) => !value)}
            type="button"
          >
            {isExpanded ? "Min" : "Max"}
          </button>
          <button
            className="rounded-lg bg-white/10 p-1.5 text-white/80"
            onClick={() => setIsHidden(true)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div
            className="max-h-[45vh] min-h-[220px] space-y-3 overflow-y-auto px-4 py-4 md:max-h-[320px] md:min-h-[240px]"
            ref={chatBodyRef}
          >
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/[0.09]"
                  onClick={() => {
                    void sendQuickPrompt(prompt);
                  }}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {visibleMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  message.role === "assistant"
                    ? "mr-6 border border-white/10 bg-white/[0.06] text-white/90"
                    : "ml-6 border border-[#3b82f6]/30 bg-gradient-to-r from-[#3b82f6]/25 to-[#a855f7]/25 text-white"
                }`}
              >
                {message.content}
              </div>
            ))}

            {isLoading && (
              <div className="mr-6 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/70">
                Pensando...
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder="Escribe tu pregunta..."
                value={input}
              />
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#ec4899] to-[#3b82f6] text-white shadow-[0_0_20px_rgba(59,130,246,0.45)]"
                onClick={() => {
                  void sendMessage();
                }}
                type="button"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
