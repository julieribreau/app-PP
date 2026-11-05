"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { cn } from "@/lib/cn";

// Éditeur riche partagé du back-office (TipTap, socle §Texte enrichi). Le HTML produit est
// nettoyé par le backend (sanitize-html, liste blanche unique) à l'écriture et au rendu.

const TOOLS = [
  {
    key: "bold",
    icon: Bold,
    run: (e: Editor) => e.chain().focus().toggleBold().run(),
    active: "bold",
  },
  {
    key: "italic",
    icon: Italic,
    run: (e: Editor) => e.chain().focus().toggleItalic().run(),
    active: "italic",
  },
  {
    key: "bulletList",
    icon: List,
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
    active: "bulletList",
  },
  {
    key: "orderedList",
    icon: ListOrdered,
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
    active: "orderedList",
  },
] as const;

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (html: string) => void;
}) {
  const t = useTranslations("admin.editor");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        "aria-labelledby": `${id}-label`,
        "aria-multiline": "true",
        role: "textbox",
        class: "rich-text min-h-24 px-3.5 py-3 text-sm leading-[21px] outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });
  React.useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-[13px] leading-[18px] font-medium">
        {label}
      </span>
      <div className="border-input bg-card focus-within:outline-ring overflow-hidden rounded-[12px] border focus-within:outline-2 focus-within:outline-offset-2">
        <div
          role="toolbar"
          aria-label={t("toolbar")}
          className="border-border bg-muted flex gap-0.5 border-b p-1"
        >
          {TOOLS.map(({ key, icon: Icon, run, active }) => (
            <button
              key={key}
              type="button"
              aria-label={t(key)}
              aria-pressed={editor?.isActive(active) ?? false}
              onClick={() => editor && run(editor)}
              className={cn(
                "hover:bg-card inline-flex size-8 cursor-pointer items-center justify-center rounded-full",
                editor?.isActive(active) && "bg-card",
              )}
            >
              <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
