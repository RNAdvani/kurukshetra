import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import Marquee from "@/components/landing/marquee";
import DebateProcess from "@/components/landing/timeline-card";
import {  useNavigate } from "react-router-dom";

const LandingPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) =>
        console.log("Autoplay prevented:", error)
      );
    }
  }, []);

  const navigate = useNavigate();

  return (
    <div>
      <div className="h-[90vh] flex flex-col md:flex-row  md:p-16">
        {/* Left Section */}
        <div className="w-full md:w-3/6 text-center md:text-left flex flex-col justify-center">
          <p className="text-6xl">
            Where <span className="italic">Intelligence </span>
            <br /> meets{" "}
            <span className="text-blue-500 font-semibold">Argumentation</span>
          </p>

          {/* Button */}
          <button onClick={()=>navigate("/onboarding") } className="bg-black dark:bg-blue-500 flex gap-2 text-white w-fit rounded-lg p-4 px-8 mt-4">
            Get Started <ArrowRight className="w-6 aspect-square" />
          </button>

          {/* Avatar Section */}
          <div className="flex align-baseline gap-2 mt-4">
            {/* Avatars */}
            <div className="z-10 flex -space-x-4">
              {[
                "https://avatars.githubusercontent.com/u/16860528",
                "https://avatars.githubusercontent.com/u/20110627",
                "https://avatars.githubusercontent.com/u/106103625",
                "https://avatars.githubusercontent.com/u/59228569",
                "https://avatar.iran.liara.run/public/boy?username=Ash",
              ].map((src, index) => (
                <img
                  key={index}
                  alt={`Avatar ${index + 1}`}
                  className="h-10 w-10 rounded-full border-2"
                  src={src}
                />
              ))}
            </div>

            {/* Rating Section */}
            <div className="flex flex-col">
              <div className="flex items-center text-black dark:text-blue-300">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-star fill-blue-300"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  ))}
                <span className="ml-2 font-bold">5.0</span>
              </div>
              <p className="text-xs tracking-tighter">
                <span className="font-bold">Hundreds</span> of debaters
                using now
              </p>
            </div>
          </div>
        </div>

        {/* Right Section - Video */}
        <div className="w-full md:w-3/6 flex justify-center items-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-3xl"
          >
            <source src="/videos/landing.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Marquee Component */}
      <Marquee />

      <DebateProcess />
    </div>
  );
};

export default LandingPage;
