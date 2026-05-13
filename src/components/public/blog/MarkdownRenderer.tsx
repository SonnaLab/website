import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Fragment } from 'react';
import { BlogDetailCTA } from './BlogDetailCTA';

interface MarkdownRendererProps {
  content: string;
  lang?: string;
  enableCtas?: boolean;
}

type CtaMarker = 'diagnostic' | 'project';

function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const current: string[] = [];
  let inCodeFence = false;

  markdown.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      current.push(line);
      return;
    }

    if (!inCodeFence && trimmed === '') {
      if (current.length) {
        blocks.push(current.join('\n'));
        current.length = 0;
      }
      return;
    }

    current.push(line);
  });

  if (current.length) blocks.push(current.join('\n'));
  return blocks.filter((block) => block.trim().length > 0);
}

function isParagraphBlock(block: string): boolean {
  const trimmed = block.trim();
  return !/^(#{1,6}\s|```|>|[-*+]\s|\d+\.\s|\|)/.test(trimmed);
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ctaInsertions(blocks: string[]): Map<number, CtaMarker[]> {
  const insertions = new Map<number, CtaMarker[]>();
  let paragraphCount = 0;
  let diagnosticIndex = Math.min(blocks.length, Math.max(1, Math.ceil(blocks.length * 0.25)));

  for (let index = 0; index < blocks.length; index += 1) {
    if (isParagraphBlock(blocks[index])) paragraphCount += 1;
    if (paragraphCount >= 2) {
      diagnosticIndex = index + 1;
      break;
    }
  }

  const conclusionIndex = blocks.findIndex((block) => {
    const text = normalise(block.replace(/^#{1,6}\s*/, ''));
    return /^#{1,6}\s/.test(block.trim()) && ['conclusion', 'pour conclure', 'next steps'].some((keyword) => text.includes(keyword));
  });

  let projectIndex = conclusionIndex >= 0 ? conclusionIndex : Math.min(blocks.length, Math.ceil(blocks.length * 0.72));
  if (projectIndex <= diagnosticIndex + 2) projectIndex = Math.min(blocks.length, diagnosticIndex + 3);

  const addInsertion = (index: number, marker: CtaMarker) => {
    const existing = insertions.get(index) ?? [];
    existing.push(marker);
    insertions.set(index, existing);
  };

  addInsertion(diagnosticIndex, 'diagnostic');
  addInsertion(projectIndex, 'project');
  return insertions;
}

export function MarkdownRenderer({ content, lang = 'fr', enableCtas = false }: MarkdownRendererProps) {
  let headingIndex = 0;
  const blocks = enableCtas ? splitMarkdownBlocks(content) : [content];
  const insertions = enableCtas ? ctaInsertions(blocks) : new Map<number, CtaMarker[]>();

  const renderMarkdown = (markdown: string, key: string) => (
    <ReactMarkdown
      key={key}
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => {
          const id = `heading-${headingIndex++}`;
          return (
            <h1 id={id} className="text-4xl font-bold mt-12 mb-6 text-gray-900 scroll-mt-24">
              {children}
            </h1>
          );
        },
        h2: ({ children }) => {
          const id = `heading-${headingIndex++}`;
          return (
            <h2 id={id} className="text-3xl font-bold mt-10 mb-5 text-gray-900 scroll-mt-24">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          const id = `heading-${headingIndex++}`;
          return (
            <h3 id={id} className="text-2xl font-semibold mt-8 mb-4 text-gray-800 scroll-mt-24">
              {children}
            </h3>
          );
        },
        p: ({ children }) => (
          <p className="text-lg leading-relaxed mb-6 text-gray-700">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside mb-6 space-y-2 text-gray-700 ml-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside mb-6 space-y-2 text-gray-700 ml-6">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-black pl-6 py-2 italic my-6 text-gray-700 bg-gray-50 rounded-r-lg">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const inline = !match;
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              className="rounded-xl my-6 shadow-lg"
              showLineNumbers
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600" {...props}>
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-6 py-4 text-sm text-gray-700 border-t border-gray-200">{children}</td>
        ),
        a: ({ children, href }) => (
          <a 
            href={href} 
            className="text-black underline decoration-2 underline-offset-2 hover:text-gray-700 font-medium transition-colors" 
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-800">{children}</em>
        ),
        img: ({ src, alt }) => (
          <figure className="my-8">
            <img 
              src={src} 
              alt={alt || ''} 
              className="rounded-xl shadow-xl w-full"
              loading="lazy"
            />
            {alt && (
              <figcaption className="text-center text-sm text-gray-600 mt-3 italic">
                {alt}
              </figcaption>
            )}
          </figure>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );

  return (
    <>
      {blocks.map((block, index) => (
        <Fragment key={`markdown-block-${index}`}>
          {insertions.get(index)?.map((marker) => (
            <BlogDetailCTA key={`${marker}-${index}`} variant={marker} lang={lang} />
          ))}
          {renderMarkdown(block, `markdown-${index}`)}
        </Fragment>
      ))}
      {insertions.get(blocks.length)?.map((marker) => (
        <BlogDetailCTA key={`${marker}-end`} variant={marker} lang={lang} />
      ))}
    </>
  );
}