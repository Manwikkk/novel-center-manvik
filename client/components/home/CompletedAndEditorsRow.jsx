import CompletedNovelsSection from '@/components/home/CompletedNovelsSection';
import EditorsChoiceSection from '@/components/home/EditorsChoiceSection';

export default function CompletedAndEditorsRow({ completed = [], editors = [] }) {
  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <CompletedNovelsSection items={completed} />
        <EditorsChoiceSection items={editors} />
      </div>
    </section>
  );
}
