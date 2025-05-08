import { useEffect, useRef } from 'react';
import gsap from 'gsap';

function App() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;

    if (!row1 || !row2) return;

    // Create infinite animations for both rows
    gsap.to(row1, {
      xPercent: -50,
      ease: "none",
      duration: 15,
      repeat: -1
    });

    // For row2, start from -50% and move to 0
    gsap.fromTo(row2, 
      { xPercent: -50 },
      {
        xPercent: 0,
        ease: "none",
        duration: 15,
        repeat: -1
      }
    );

    // Hover effect for individual text elements
    const textElements = document.querySelectorAll('.text-element');
    textElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        gsap.to(element, {
          scale: 1.1,
          color: '#60A5FA',
          duration: 0.3,
          ease: "power2.out"
        });
      });

      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          scale: 1,
          color: 'black',
          duration: 0.3,
          ease: "power2.in"
        });
      });
    });
  }, []);

  // Unique debating-related phrases
  const textContent = [
    "Debate. Defend. Persuade.",
    "Challenge Ideas, Shape Perspectives.",
    "Facts Over Opinions.",
    "Every Argument Matters.",
    "Convince with Clarity.",
    "Where Logic Meets Passion.",
    "Engage. Express. Empower.",
    "Master the Art of Argument.",
  ];

  return (
    <div className=" flex flex-col items-center justify-center overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(96,165,250,0.1),transparent)] pointer-events-none" />
      
      {/* First row */}
      <div className="w-full whitespace-nowrap overflow-hidden mb-12 relative">
        <div 
          ref={row1Ref} 
          className="inline-block"
          style={{ width: '200%' }}
        >
          {textContent.concat(textContent).map((text, i) => (
            <span 
              key={i}
              className="text-element text-6xl md:text-4xl font-bold text-black mx-8 inline-block cursor-pointer transition-transform"
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Second row */}
      <div className="w-full whitespace-nowrap overflow-hidden relative">
        <div 
          ref={row2Ref} 
          className="inline-block"
          style={{ width: '200%' }}
        >
          {textContent.concat(textContent).map((text, i) => (
            <span 
              key={i}
              className="text-element text-6xl md:text-4xl font-bold text-black mx-8 inline-block cursor-pointer transition-transform"
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
