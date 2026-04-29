export default function ReadingColumn({ html }) {
  return (
    <article
      className="prose-reader mx-auto max-w-reading w-full px-4 md:px-0 py-12 md:py-16"
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}
