import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-32">
        <EmptyState
          title="nothing lives here"
          body="That page doesn't exist, or it's moved. Back to the good stuff?"
          art={<span className="serif text-[72px] italic leading-none">404</span>}
          cta={{ href: "/", label: "Take me home" }}
        />
      </main>
    </>
  );
}
