import { useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import type { editor as MonacoEditor } from 'monaco-editor';
import { monaco, SUPPORTED_LANGUAGES } from '../../lib/monaco';
import { useCollaborativeDoc } from '../../hooks/useCollaborativeDoc';

interface CodeEditorProps {
  docId: string;
}

export function CodeEditor({ docId }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState('typescript');

  const { doc, provider } = useCollaborativeDoc(docId, 'code');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const yText = doc.getText('monaco');
    const yMeta = doc.getMap('meta');

    const model = monaco.editor.createModel(
      '',
      'typescript',
      monaco.Uri.parse(`file:///syncspace/${docId}/main`)
    );
    const editor = monaco.editor.create(container, {
      model,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineHeight: 22,
      tabSize: 2,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      stickyScroll: { enabled: false },
      fixedOverflowWidgets: true,
      renderWhitespace: 'selection',
    });
    editorRef.current = editor;

    const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);

    const syncLanguage = () => {
      const stored = yMeta.get('language');
      const next = typeof stored === 'string' ? stored : 'typescript';
      if (monaco.languages.getLanguages().some((entry) => entry.id === next)) {
        monaco.editor.setModelLanguage(model, next);
      }
      setLanguage(next);
    };
    syncLanguage();
    yMeta.observe(syncLanguage);

    return () => {
      yMeta.unobserve(syncLanguage);
      binding.destroy();
      editor.dispose();
      model.dispose();
      editorRef.current = null;
    };
  }, [doc, docId, provider]);

  const changeLanguage = (next: string) => {
    const model = editorRef.current?.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, next);
    }
    doc.getMap('meta').set('language', next);
    setLanguage(next);
  };

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <select
        className="input"
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        style={{
          position: 'absolute',
          top: 10,
          right: 14,
          width: 150,
          zIndex: 10,
          fontSize: 12,
          padding: '5px 8px',
          cursor: 'pointer',
        }}
        aria-label="Programming language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
