import CompletedNovelsSection from '@/components/home/CompletedNovelsSection';
import EditorsChoiceSection from '@/components/home/EditorsChoiceSection';

export default function CompletedAndEditorsRow({ completed = [], editors = [], visibility = {} }) {
  const showCompleted = visibility.completed_novels !== false;
  const showEditors = visibility.editors_choice !== false;
  if (!showCompleted && !showEditors) return null;

  const both = showCompleted && showEditors;
  const gridClass = both ? 'grid grid-cols-1 lg:grid-cols-2 gap-10 items-start' : 'grid grid-cols-1 gap-10 items-start';

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      <div className={gridClass}>
        {showCompleted ? <CompletedNovelsSection items={completed} /> : null}
        {showEditors ? <EditorsChoiceSection items={editors} /> : null}
      </div>
    </section>
  );
}
