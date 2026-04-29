export default function SynopsisBlock({ synopsis }) {
  if (!synopsis) return null;
  return (
    <section className="mt-16 max-w-reading">
      <h2 className="label-sm uppercase text-ink-400">About the book</h2>
      <p className="mt-4 font-serif text-[20px] leading-[1.6] text-ink-700">
        {synopsis}
      </p>
    </section>
  );
}
