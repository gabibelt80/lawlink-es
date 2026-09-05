"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Printer,
  Save,
  X,
  Loader2,
  Undo,
  Redo,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Pilcrow,
  ChevronDown,
  Strikethrough,
  MessageSquare,
  Sparkles,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Extensión para tamaño de fuente
const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

type WritingEditorProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onSave: (title: string, content: string) => void;
  isPending?: boolean;
};

const FONT_FAMILIES = [
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const FONT_SIZES = [
  { label: "10", value: "10pt" },
  { label: "11", value: "11pt" },
  { label: "12", value: "12pt" },
  { label: "14", value: "14pt" },
  { label: "16", value: "16pt" },
  { label: "18", value: "18pt" },
  { label: "20", value: "20pt" },
  { label: "24", value: "24pt" },
];

export function WritingEditor({
  open,
  onClose,
  title: initialTitle,
  content: initialContent,
  onSave,
  isPending,
}: WritingEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        underline: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Escriba el contenido del escrito...",
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[250mm] px-[20mm] py-[20mm]",
        style:
          "font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000;",
      },
    },
  });

  if (!open) return null;

  function handleSave() {
    if (!editor) return;
    onSave(title, editor.getHTML());
  }

  function handlePrint() {
    if (!editor) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              margin: 20mm;
              color: #000;
            }
            @page {
              size: A4;
              margin: 20mm;
            }
          </style>
        </head>
        <body>
          ${editor.getHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  async function handleChatSubmit() {
    if (!chatInput.trim() || !editor) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const { chatWithDocument } = await import("@/server/ai/document-chat");
      const result = await chatWithDocument({
        documentContent: editor.getHTML(),
        documentTitle: title,
        message: userMessage,
      });

      setChatMessages((prev) => [...prev, { role: "assistant", content: result.response }]);

      if (result.editedContent) {
        editor.commands.setContent(result.editedContent);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error al comunicarse con la IA" }]);
    } finally {
      setChatLoading(false);
    }
  }

  function setFontFamily(value: string) {
    if (!editor) return;
    editor.chain().focus().setFontFamily(value).run();
  }

  function setFontSize(value: string) {
    if (!editor) return;
    editor.chain().focus().setFontSize(value).run();
  }

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
        disabled && "opacity-40"
      )}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className="h-6 w-px bg-border" />;

  const SelectWrapper = ({
    value,
    onChange,
    options,
    className,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    className?: string;
  }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-7 appearance-none rounded border border-border bg-white pl-2 pr-6 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
          className
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f5f5f5]">
      {/* Toolbar principal */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-white px-3 py-1.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Cerrar editor"
        >
          <X className="h-4 w-4" />
        </button>

        <ToolbarDivider />

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm font-medium focus:outline-none"
          placeholder="Nombre del escrito"
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          title="Deshacer"
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          title="Rehacer"
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setChatOpen(!chatOpen)}
          className="h-7 gap-1 px-2 text-[11px]"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          IA
        </Button>

        <ToolbarDivider />

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="h-7 gap-1 px-2 text-[11px]"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="h-7 gap-1 px-2 text-[11px]"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar
        </Button>
      </div>


      {/* Toolbar de formato */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-white px-3 py-1">
        <SelectWrapper
          value="Georgia, 'Times New Roman', serif"
          onChange={setFontFamily}
          options={FONT_FAMILIES}
          className="w-[130px]"
        />

        <SelectWrapper
          value="12pt"
          onChange={setFontSize}
          options={FONT_SIZES}
          className="w-[60px]"
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          title="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          title="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive("underline")}
          title="Subrayado"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive("strike")}
          title="Tachado"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <div className="relative">
          <input
            type="color"
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            className="h-7 w-7 cursor-pointer rounded border border-border p-0.5"
            title="Color de texto"
          />
        </div>

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
          active={editor?.isActive("highlight")}
          title="Resaltar"
        >
          <Highlighter className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive("heading", { level: 1 })}
          title="Título 1"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 })}
          title="Título 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive("heading", { level: 3 })}
          title="Título 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          active={editor?.isActive({ textAlign: "left" })}
          title="Alinear a la izquierda"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          active={editor?.isActive({ textAlign: "center" })}
          title="Centrar"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          active={editor?.isActive({ textAlign: "right" })}
          title="Alinear a la derecha"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          active={editor?.isActive({ textAlign: "justify" })}
          title="Justificar"
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          title="Lista con viñetas"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().setParagraph().run()}
          active={editor?.isActive("paragraph")}
          title="Párrafo"
        >
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      {/* Contenido principal con chat lateral */}
      <div className="flex flex-1 overflow-hidden">
        {/* Hoja A4 */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-[210mm] rounded-sm bg-white shadow-lg">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Chat IA lateral */}
        {chatOpen && (
          <div className="flex w-80 shrink-0 flex-col border-l border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Asistente IA
              </span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">
                  Pedile a la IA que modifique el documento, ej: "Cambiá el encabezado a formato legal"
                </p>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[11px] max-w-[85%]",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pensando...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                placeholder="Escribí tu instrucción..."
                className="flex-1 h-8 rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleChatSubmit}
                disabled={chatLoading || !chatInput.trim()}
                className="h-8 gap-1 px-2 text-[11px]"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}