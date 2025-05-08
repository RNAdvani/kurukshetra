import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CircleData {
  text: string;
  color: string;
}

const circles: CircleData[] = [
  { text: "PANDAVA 1", color: "#1a1a1a" },
  { text: "PANDAVA 2", color: "#2a2a2a" },
  { text: "PANDAVA 3", color: "#3a3a3a" },
  { text: "PANDAVA 4", color: "#4a4a4a" },
  { text: "PANDAVA 5", color: "#5a5a5a" }
];

const radius = 200;

const App = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const angles = useRef<{ value: number }[]>([]);

  useEffect(() => {
    // Initialize angles and positions
    angles.current = circles.map((_, i) => ({
      value: ((i * 360) / 5) + 90 // Start from top
    }));

    // Set initial positions
    circles.forEach((_, i) => {
      const angle = angles.current[i].value;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const y = Math.sin((angle * Math.PI) / 180) * radius;
      gsap.set(circleRefs.current[i], { x, y });
    });

    // Hide texts initially
    gsap.set(textRefs.current, { opacity: 0, y: 20 });

    // Create animation timeline
    const tl = gsap.timeline();

    // Animate circular rotation
    tl.to(angles.current, {
      value: (i:any) => angles.current[i].value + 720,
      duration: 4,
      ease: "power2.out",
      onUpdate: () => {
        angles.current.forEach((angle, i) => {
          const x = Math.cos((angle.value * Math.PI) / 180) * radius;
          const y = Math.sin((angle.value * Math.PI) / 180) * radius;
          gsap.set(circleRefs.current[i], { x, y });
        });
      }
    });

    // After rotation completes
    tl.add(() => {
      // Fade in texts
      gsap.to(textRefs.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.15,
        ease: "back.out(1.7)"
      });

      // Scale up circles
      gsap.to(circleRefs.current, {
        scale: 2,
        duration: 0.5,
        stagger: 0.15,
        ease: "power2.out"
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div ref={containerRef} className="relative w-[500px] h-[500px]">
        {circles.map((circle, index) => (
          <div
            key={index}
            ref={el => circleRefs.current[index] = el}
            className="absolute left-1/2 top-1/2"
          >
            <div className="relative">
              <div 
                className="w-28 h-28 rounded-full border-4"
                style={{ borderColor: circle.color }}
              />
              <div
                ref={el => textRefs.current[index] = el}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                           text-sm font-bold text-gray-800 whitespace-nowrap"
              >
                {circle.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;