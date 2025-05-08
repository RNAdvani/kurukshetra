"use client"

import { useEffect } from "react"
import gsap from "gsap"
import {
  Brain,
  Users,
  MessageSquare,
  HandMetal,
  Activity,
  Trophy,
  Globe,
  BarChartIcon as ChartBar,
  Shield,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

const features = [
  {
    title: "AI Debate Training",
    description: "Train with advanced AI that adapts to your skill level and provides real-time feedback",
    icon: Brain,
    size: "lg",
    gradient: "from-purple-500 to-rose-500",
    highlight: true,
    link : "/coach"
  },
  {
    title: "Debate Character AI",
    description: "Practice with AI personas representing different debate styles and philosophies",
    icon: MessageSquare,
    size: "lg",
    gradient: "from-blue-500 to-purple-500",
    link:"/character"
  },
  {
    title: "Sign Language Debate",
    description: "Revolutionary platform supporting sign language debates with real-time AI translation",
    icon: HandMetal,
    size: "md",
    gradient: "from-emerald-500 to-teal-500",
    link:"#"
  },
  {
    title: "Pandavas System",
    description: "Experience multi-perspective debates with our five specialized LLMs working in harmony",
    icon: Users,
    size: "lg",
    gradient: "from-amber-500 to-orange-500",
    highlight: true,
    link:"/debate-recorder"
  },
  {
    title: "Smart Matching",
    description: "Get paired with debaters of similar skill levels using AI",
    icon: Activity,
    size: "md",
    gradient: "from-pink-500 to-rose-500",
    link:"/compete"
  },
  {
    title: "Global Tournaments",
    description: "Compete in AI-judged tournaments with participants worldwide",
    icon: Trophy,
    size: "md",
    gradient: "from-yellow-500 to-amber-500",
    link:"#"
  },
  {
    title: "Real-time Analytics",
    description: "Track your performance with AI-powered analytics",
    icon: ChartBar,
    size: "md",
    gradient: "from-cyan-500 to-blue-500",
    link:"#"
  },
  {
    title: "Cross-cultural Debates",
    description: "Break language barriers with AI translation in 50+ languages",
    icon: Globe,
    size: "md",
    gradient: "from-violet-500 to-purple-500",
    link:"#"
  },
  {
    title: "Instant Fact-checking",
    description: "AI-powered real-time fact verification system",
    icon: Shield,
    size: "sm",
    gradient: "from-red-500 to-pink-500",
    link:"#"
  },
]

export default function DebateFeatures() {
  const navigate = useNavigate()
  useEffect(() => {
    gsap.set(".animate-item", { scale: 0, opacity: 0 })
    gsap.to(".animate-item", {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      ease: "expo.inOut",
      stagger: 0.1,
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff1d0] via-[#ffee70] to-[#fff1d0] p-8">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                onClick={()=>navigate(feature.link)}
                className={`animate-item  bg-white/40 backdrop-blur-sm rounded-3xl p-6 cursor-pointer 
                  border border-white/60 shadow-xl transition-all duration-300
                  ${feature.size === "lg" ? "md:col-span-2" : feature.size === "md" ? "md:col-span-1" : "md:col-span-1"}
                  ${feature.highlight ? "bg-white/40" : ""} ${feature.title === "Pandavas System"? "":""}
                `}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${feature.gradient} mb-4`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-black mb-2">{feature.title}</h3>
                <p className="text-gray-700 text-sm">{feature.description}</p>
                
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}