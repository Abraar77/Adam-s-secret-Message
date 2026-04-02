import { SignupPanel } from "@/components/signup-panel";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 sm:px-10 lg:py-16">
      <SignupPanel />
    </main>
  );
}
