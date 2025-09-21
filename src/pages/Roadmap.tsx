import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  Home,
  Calendar,
  CheckCircle,
  Clock,
  Star,
  Zap,
  Globe,
  Shield,
  Users,
  Rocket,
  Target,
  Award,
  Sparkles,
  TrendingUp,
  Lock,
  Wallet,
  ThumbsUp
} from "lucide-react";

export default function Roadmap() {
  const [selectedPhase, setSelectedPhase] = useState(0);

  const roadmapPhases = [
    {
      id: 0,
      title: "Foundation Phase",
      status: "in-progress",
      timeline: "Q4 2025",
      description: "Core infrastructure and initial governance framework",
      features: [
        { name: "Basic Elections UI", status: "in-progress", description: "Election creation and management interface" },
        { name: "enVOI Identity System", status: "pending", description: "Cross-chain identity binding" },
        { name: "Stake-to-Vote Mechanism", status: "completed", description: "Minimum 7-day lock requirement" },
        { name: "Multi-Chain Support", status: "pending", description: "VOI, ALGO, EVM integration" },
        { name: "Basic Governance UI", status: "in-progress", description: "Proposal creation and voting" }
      ],
      color: "teal",
      icon: Shield
    },
    {
      id: 1,
      title: "Expansion Phase",
      status: "pending",
      timeline: "Q1 2026",
      description: "Enhanced features and broader ecosystem integration",
      features: [
        { name: "Advanced Delegation", status: "pending", description: "Smart delegation with reputation scoring" },
        { name: "Guild System", status: "pending", description: "Community-driven governance groups" },
        { name: "Cross-Chain Bridges", status: "pending", description: "Seamless asset transfers" },
        { name: "Mobile App", status: "pending", description: "Native iOS and Android apps" },
        { name: "Analytics Dashboard", status: "pending", description: "Governance insights and metrics" }
      ],
      color: "violet",
      icon: Rocket
    },
    {
      id: 2,
      title: "Innovation Phase",
      status: "pending",
      timeline: "Q2 2026",
      description: "Cutting-edge governance features and AI integration",
      features: [
        { name: "AI Proposal Analysis", status: "pending", description: "Automated impact assessment" },
        { name: "Dynamic Voting Power", status: "pending", description: "Context-aware VP calculations" },
        { name: "Governance NFTs", status: "pending", description: "Achievement-based governance tokens" },
        { name: "Cross-Chain DAOs", status: "pending", description: "Multi-chain organization management" },
        { name: "Prediction Markets", status: "pending", description: "Governance outcome forecasting" }
      ],
      color: "blue",
      icon: Star
    },
    {
      id: 3,
      title: "Ecosystem Phase",
      status: "pending",
      timeline: "Q3-Q4 2026",
      description: "Full ecosystem maturity and global adoption",
      features: [
        { name: "Global Governance", status: "pending", description: "Worldwide governance participation" },
        { name: "Institutional Integration", status: "pending", description: "Enterprise governance solutions" },
        { name: "Regulatory Compliance", status: "pending", description: "Multi-jurisdiction legal framework" },
        { name: "Sustainability Focus", status: "pending", description: "Carbon-neutral governance operations" },
        { name: "Research Partnerships", status: "pending", description: "Academic and industry collaborations" }
      ],
      color: "green",
      icon: Award
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "in-progress": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "pending": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getPhaseColor = (color: string) => {
    switch (color) {
      case "teal": return "glass-morphism neon-glow-teal";
      case "violet": return "glass-morphism-violet neon-glow-violet";
      case "blue": return "glass-morphism-silver neon-glow-silver";
      case "green": return "glass-morphism neon-glow-teal";
      default: return "glass-morphism";
    }
  };

  const getPhaseIcon = (color: string) => {
    switch (color) {
      case "teal": return "text-teal-400";
      case "violet": return "text-violet-400";
      case "blue": return "text-blue-400";
      case "green": return "text-green-400";
      default: return "text-gray-400";
    }
  };

  const completedFeatures = roadmapPhases.reduce((total, phase) => 
    total + phase.features.filter(f => f.status === "completed").length, 0
  );
  const totalFeatures = roadmapPhases.reduce((total, phase) => 
    total + phase.features.length, 0
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="text-gray-400 hover:text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <div className="hidden md:block h-6 w-px bg-gray-600"></div>
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/voting'}
                className="hidden md:flex text-gray-400 hover:text-white"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Voting
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="glass-morphism-silver neon-glow-silver">
                <Shield className="w-4 h-4 mr-2" />
                Connected: shelly.voi
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gradient-primary mb-2">
              enChain Voting Roadmap ✦ One voice, many chains.
            </h1>
            <p className="text-gray-400 text-lg">
              Our journey toward decentralized governance excellence
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Progress Overview */}
        <Card className="glass-morphism-violet neon-glow-violet mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gradient mb-2">
                  {completedFeatures}/{totalFeatures}
                </div>
                <div className="text-sm text-gray-400">Features Completed</div>
                <Progress value={(completedFeatures / totalFeatures) * 100} className="h-2 mt-2" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-400 mb-2">
                  {roadmapPhases.filter(p => p.status === "completed").length}
                </div>
                <div className="text-sm text-gray-400">Phases Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-400 mb-2">
                  {roadmapPhases.filter(p => p.status === "in-progress").length}
                </div>
                <div className="text-sm text-gray-400">Active Phases</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase Navigation */}
        <div className="flex flex-wrap gap-4 mb-8">
          {roadmapPhases.map((phase, index) => {
            const IconComponent = phase.icon;
            return (
              <Button
                key={phase.id}
                variant={selectedPhase === index ? "default" : "outline"}
                onClick={() => setSelectedPhase(index)}
                className={`${selectedPhase === index ? getPhaseColor(phase.color) : ""} flex items-center gap-2`}
              >
                <IconComponent className="w-4 h-4" />
                {phase.title}
              </Button>
            );
          })}
        </div>

        {/* Selected Phase Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Phase Overview */}
          <div className="lg:col-span-1">
            <Card className={`${getPhaseColor(roadmapPhases[selectedPhase].color)} h-fit`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-black/20 ${getPhaseIcon(roadmapPhases[selectedPhase].color)}`}>
                    {(() => {
                      const IconComponent = roadmapPhases[selectedPhase].icon;
                      return <IconComponent className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{roadmapPhases[selectedPhase].title}</CardTitle>
                    <Badge className={getStatusColor(roadmapPhases[selectedPhase].status)}>
                      {roadmapPhases[selectedPhase].status.replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Timeline</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold">{roadmapPhases[selectedPhase].timeline}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-2">Description</div>
                  <p className="text-gray-300">{roadmapPhases[selectedPhase].description}</p>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-2">Progress</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span>
                        {roadmapPhases[selectedPhase].features.filter(f => f.status === "completed").length}/
                        {roadmapPhases[selectedPhase].features.length}
                      </span>
                    </div>
                    <Progress 
                      value={(roadmapPhases[selectedPhase].features.filter(f => f.status === "completed").length / roadmapPhases[selectedPhase].features.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <div className="lg:col-span-2">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Features & Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {roadmapPhases[selectedPhase].features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-black/20 border border-gray-800">
                    <div className="flex-shrink-0 mt-1">
                      {feature.status === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-teal-400" />
                      ) : feature.status === "in-progress" ? (
                        <Clock className="w-5 h-5 text-violet-400" />
                      ) : (
                        <Star className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{feature.name}</h3>
                        <Badge variant="outline" className={getStatusColor(feature.status)}>
                          {feature.status.replace("-", " ")}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline Visualization */}
        <Card className="glass-morphism mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Development Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-teal-400 via-violet-400 to-blue-400"></div>
              
              {/* Timeline Items */}
              <div className="space-y-8">
                {roadmapPhases.map((phase, index) => {
                  const IconComponent = phase.icon;
                  return (
                    <div key={phase.id} className="relative flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getPhaseColor(phase.color)} z-10`}>
                        <IconComponent className={`w-8 h-8 ${getPhaseIcon(phase.color)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-semibold">{phase.title}</h3>
                          <Badge className={getStatusColor(phase.status)}>
                            {phase.status.replace("-", " ")}
                          </Badge>
                          <span className="text-gray-400">{phase.timeline}</span>
                        </div>
                        <p className="text-gray-300 mb-3">{phase.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {phase.features.map((feature, featureIndex) => (
                            <Badge 
                              key={featureIndex} 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(feature.status)}`}
                            >
                              {feature.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Community Call to Action */}
        <Card className="glass-morphism-silver neon-glow-silver mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Join the Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-300 text-lg">
                Be part of the future of decentralized governance. Your voice shapes our roadmap.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button className="neon-glow-teal">
                  <Globe className="w-4 h-4 mr-2" />
                  Join Governance
                </Button>
                <Button variant="outline" className="neon-glow-violet">
                  <Wallet className="w-4 h-4 mr-2" />
                  Stake & Vote
                </Button>
                <Button variant="outline" className="neon-glow-silver">
                  <Users className="w-4 h-4 mr-2" />
                  Join Community
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
