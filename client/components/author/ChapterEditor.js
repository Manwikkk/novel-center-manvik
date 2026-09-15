'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { Bold, Italic, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const TOOLBAR = [
  { name: 'bold',     icon: Bold,          run: (e) => e.chain().focus().toggleBold().run(),    isActive: (e) => e.isActive('bold') },
  { name: 'italic',   icon: Italic,        run: (e) => e.chain().focus().toggleItalic().run(),  isActive: (e) => e.isActive('italic') },
  { name: 'strike',   icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run(),  isActive: (e) => e.isActive('strike') },
  { name: 'h2',       icon: Heading2,      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive('heading', { level: 2 }) },
  { name: 'h3',       icon: Heading3,      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e) => e.isActive('heading', { level: 3 }) },
  { name: 'bullet',   icon: List,          run: (e) => e.chain().focus().toggleBulletList().run(),  isActive: (e) => e.isActive('bulletList') },
  { name: 'ordered',  icon: ListOrdered,   run: (e) => e.chain().focus().toggleOrderedList().run(), isActive: (e) => e.isActive('orderedList') },
  { name: 'quote',    icon: Quote,         run: (e) => e.chain().focus().toggleBlockquote().run(),  isActive: (e) => e.isActive('blockquote') },
];

export default function ChapterEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Placeholder.configure({ placeholder: 'Begin the chapter…' }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'chapter-editor-prose w-full focus:outline-none px-6 py-8 min-h-full',
      },
    },
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="h-[60vh] border border-surface-variant rounded-md bg-surface-container-low" />;
  }

  function setLink() {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3 p-1 bg-surface-container border border-surface-variant rounded-md w-fit">
        {TOOLBAR.map(({ name, icon: Icon, run, isActive }) => (
          <button
            key={name}
            type="button"
            onClick={() => run(editor)}
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded',
              isActive(editor) ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high',
            )}
            aria-label={name}
            title={name}
          >
            <Icon size={14} />
          </button>
        ))}
        <button type="button" onClick={setLink} className="h-8 w-8 inline-flex items-center justify-center rounded text-on-surface hover:bg-surface-container-high" title="Link">
          <LinkIcon size={14} />
        </button>
        <span className="mx-1 w-px bg-surface-variant" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className="h-8 w-8 inline-flex items-center justify-center rounded text-on-surface hover:bg-surface-container-high" title="Undo">
          <Undo2 size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className="h-8 w-8 inline-flex items-center justify-center rounded text-on-surface hover:bg-surface-container-high" title="Redo">
          <Redo2 size={14} />
        </button>
      </div>
      <div className="border border-surface-variant rounded-md bg-surface-container-lowest overflow-hidden">
        {/* color-scheme keeps the native scrollbar in step with the site theme (dark mode). */}
        <div className="h-[60vh] overflow-y-auto [color-scheme:light] dark:[color-scheme:dark]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
