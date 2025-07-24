import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useToast, toast } from "@/components/ui/use-toast";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import CreateProposalForm from "./CreateProposalForm";
import CreateProposalPreview from "./CreateProposalPreview";
import CreateProposalGuidelines from "./CreateProposalGuidelines";

const proposalSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(64, "Title must be 64 characters or less"),
  description: z.string()
    .min(1, "Description is required")
    .max(512, "Description must be 512 characters or less"),
  category: z.enum([
    "Treasury",
    "Governance",
    "Infrastructure",
    "Community",
    "Development",
    "Security",
  ], { required_error: "Category is required" }),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

const CreateProposal = () => {
  const { activeWallet } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
    },
  });

  const watchedValues = form.watch();

  const handleSubmit = async (data: ProposalFormData) => {
    if (!activeWallet) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a proposal.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock proposal creation transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("Creating proposal:", data);
      
      // In real app, this would:
      // 1. Call the governance contract to create the proposal
      // 2. Wait for transaction confirmation
      // 3. Redirect to the new proposal page
      
      toast({
        title: "Proposal Created",
        description: "Your proposal was created successfully! (Mock)",
        variant: "default",
      });
      form.reset();
    } catch (error) {
      console.error('Proposal creation failed:', error);
      toast({
        title: "Proposal Creation Failed",
        description: "Failed to create proposal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Animated Hero Section (copied and adapted from Governance.tsx) ---
  const HeroSection = (
    <div className="relative min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center overflow-hidden w-full py-4 sm:py-8 md:py-16 md:pt-24 pb-8 sm:pb-16 md:pb-24">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}></div>
        </div>
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
      </div>
      {/* Hero Content */}
      <div className="relative z-10 text-center px-2 sm:px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl leading-tight mb-4">
          Create a Proposal
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg mb-4 px-2">
          Propose new ideas, improvements, or changes. Your voice shapes the future of the ecosystem.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
          <Button
            asChild
            variant="outline"
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/governance/proposals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/governance">
              Governance Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!activeWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
        {HeroSection}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert className="mt-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to connect your wallet to create a proposal. Please connect your wallet and try again.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
      {HeroSection}
      <div className="container mx-auto px-4 pb-16">
        {/* Section Divider and Header */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-2xl font-bold text-white tracking-tight animate-fade-in">Create Proposal</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-8">
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5" />
                  New Proposal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreateProposalForm
                  form={form}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                  activeWallet={activeWallet}
                />
              </CardContent>
            </Card>
            <CreateProposalGuidelines />
          </div>
          {/* Preview (always visible) */}
          <CreateProposalPreview watchedValues={watchedValues} activeWallet={activeWallet} />
        </div>
      </div>
    </div>
  );
};

export default CreateProposal; 