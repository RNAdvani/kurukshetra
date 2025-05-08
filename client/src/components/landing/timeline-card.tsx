import { Clock } from "lucide-react";

export default function DebateProcess() {
  const steps = [
    {
      icon: <Clock className="h-5 w-5" />,
      text: "A debater formulates a topic to argue.",
      color: "text-muted-foreground",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      text: "Researches key arguments and supporting evidence.",
      color: "text-yellow-500",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      text: "Drafts an opening statement to set the stage.",
      color: "text-yellow-500",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      text: "Anticipates counterarguments and prepares rebuttals.",
      color: "text-yellow-500",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      text: "Engages in the debate, responding to challenges.",
      color: "text-yellow-500",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      text: "Delivers a compelling closing argument to reinforce the stance.",
      color: "text-red-500",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 flex bg-white items-center rounded-xl border my-10">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
        <div className="space-y-6">
          <div className="inline-block rounded-full bg-black px-4 py-1.5">
            <span className="text-sm font-medium text-white">Master the Art of Debate</span>
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tight lg:text-5xl">
            Every great argument follows a structured process.
          </h1>
          <p className="text-lg text-muted-foreground">
            Crafting a strong argument isn’t just about having opinions—it’s about research, strategy, and clarity. 
            The best debaters follow a structured approach: from researching evidence to delivering powerful rebuttals. 
            Mastering this process will elevate your debating skills and sharpen your critical thinking.
          </p>
        </div>
        <div className="relative pl-6 flex justify-center items-center h-full">
          <div className="absolute left-0 top-[24px] bottom-0 w-px bg-border" />
          <div className="space-y-8 justify-center items-center">
            {steps.map((step, index) => (
              <div key={index} className="relative pl-6">
                <div className="absolute left-[-11px] top-1 h-5 w-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  <div className={step.color}>{step.icon}</div>
                </div>
                <p className="text-base">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
