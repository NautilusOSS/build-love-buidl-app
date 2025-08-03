import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Twitter,
  Share2,
} from "lucide-react";
import { NetworkId, useWallet } from "@txnlab/use-wallet-react";
import { useToast, toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import CreateProposalForm from "./CreateProposalForm";
import CreateProposalPreview from "./CreateProposalPreview";
import CreateProposalGuidelines from "./CreateProposalGuidelines";
import { CONTRACT } from "ulujs";
import algosdk from "algosdk";
import { getGovernanceAppId } from "@/constants/appIds";
import { APP_SPEC as PowGovernanceAppSpec } from "@/clients/PowGovernanceClient.ts";

// Custom Modal with rounded backdrop
const RoundedModal = ({ 
  open, 
  onOpenChange, 
  children 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  children: React.ReactNode; 
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Full screen backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0" />
      {/* Modal content */}
      <div className="relative z-10 w-full max-w-md mx-8">
        {children}
      </div>
    </div>
  );
};

const proposalSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(64, "Title must be 64 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(512, "Description must be 512 characters or less"),
  category: z.enum(
    [
      "Treasury Shenanigans",
      "Number Go Up (Tokenomics)",
      "Govna Stuff (Governance)",
      "Protocol Wizardry",
      "Pacts with Other Degens (Partnerships)",
      "Hype Machine (Marketing)",
      "Science or Scam? (Experimental)",
      "Buildoors' Corner (Tooling)",
      "Sprouting Ideas (New Stuff)",
      "Do Tasks, Get Bags (Bounties)",
    ],
    { required_error: "Category is required" }
  ),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

// Map category strings to contract category IDs
const getCategoryId = (category: string): number => {
  const categoryMap: Record<string, number> = {
    "Treasury Shenanigans": 1, // Treasury
    "Number Go Up (Tokenomics)": 2, // Protocol Parameters
    "Govna Stuff (Governance)": 0, // General
    "Protocol Wizardry": 5, // Technical
    "Pacts with Other Degens (Partnerships)": 4, // Community
    "Hype Machine (Marketing)": 4, // Community
    "Science or Scam? (Experimental)": 3, // Security
    "Buildoors' Corner (Tooling)": 5, // Technical
    "Sprouting Ideas (New Stuff)": 0, // General
    "Do Tasks, Get Bags (Bounties)": 4, // Community
  };
  return categoryMap[category] || 0;
};

const CreateProposal = () => {
  const {
    activeAccount,
    activeWallet,
    activeNetwork,
    algodClient,
    signTransactions,
  } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationSuccessDialogOpen, setCreationSuccessDialogOpen] = useState(false);
  const [createdProposalData, setCreatedProposalData] = useState<{
    title: string;
    id: string;
  } | null>(null);
  const navigate = useNavigate();

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
    if (!activeAccount) {
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("Creating proposal:", data);

      // In real app, this would:
      // 1. Call the governance contract to create the proposal
      // 2. Wait for transaction confirmation
      // 3. Redirect to the new proposal page
      const algod =
        activeNetwork === NetworkId.LOCALNET
          ? new algosdk.Algodv2(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "http://10.0.0.31",
              4001
            )
          : algodClient;
      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: PowGovernanceAppSpec.contract.methods,
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      ci.setEnableRawBytes(true);
      const proposeR = await ci.propose(
        new Uint8Array(
          [...data.title.padEnd(64, "\0")].map((char) => char.charCodeAt(0))
        ),
        new Uint8Array(
          [...data.description.padEnd(512, "\0")].map((char) =>
            char.charCodeAt(0)
          )
        ),
        getCategoryId(data.category),
        Math.floor(new Date().getTime() / 1000)
      );
      console.log("proposeR", proposeR);
      if (!proposeR.success) {
        toast({
          title: "Proposal Creation Failed",
          description: "Failed to create proposal. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const stxns = await signTransactions(
        proposeR.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );
      console.log("stxns", stxns);
      const txid = await algod.sendRawTransaction(stxns).do();
      console.log("txid", txid);

      // Extract proposal node from the response and convert to base64
      if (!proposeR.returnValue) {
        throw new Error("No proposal ID returned from contract");
      }

      // Convert Uint8Array to hex string
      const hexString = Array.from(proposeR.returnValue)
        .map((b) => (b as number).toString(16).padStart(2, "0"))
        .join("");
      const proposalNode = hexString;
      console.log("proposalNode", proposalNode);
      console.log("hexString", hexString);

      // Store the created proposal data for the success modal
      setCreatedProposalData({
        title: data.title,
        id: proposalNode,
      });

      // Show the success dialog instead of immediately navigating
      setCreationSuccessDialogOpen(true);

      form.reset();
    } catch (error) {
      console.error("Proposal creation failed:", error);
      toast({
        title: "Proposal Creation Failed",
        description: "Failed to create proposal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateTwitterMessage = () => {
    if (!createdProposalData) return "";

    const proposalTitle =
      createdProposalData.title.length > 50
        ? createdProposalData.title.substring(0, 47) + "..."
        : createdProposalData.title;

    // Construct proposal URL
    const proposalUrl = `${window.location.origin}/governance/proposals/${createdProposalData.id}`;

    const message = `🚀 Just created a new governance proposal!\n\n"${proposalTitle}"\n\n🗳️ This proposal is now pending activation.\n\nWant to help get it activated? Check it out:\n${proposalUrl}\n\n#Governance #DAO #Web3`;

    return message;
  };

  const handleShareOnTwitter = () => {
    const message = generateTwitterMessage();

    // Create a more engaging tweet with clear call-to-action
    const enhancedMessage = `${message}\n\n🗳️ Community Poll:\nShould this proposal be activated?\n\n✅ Yes - I support this proposal\n❌ No - I oppose this proposal\n\n💡 Tip: You can add a Twitter poll after posting this tweet!`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      enhancedMessage
    )}`;

    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleShareWithPollInstructions = () => {
    const message = generateTwitterMessage();

    // Create a shorter message that leaves room for a poll
    const shortMessage = `${message}\n\n🗳️ What do you think?`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shortMessage
    )}`;

    // Open Twitter and show instructions
    window.open(twitterUrl, "_blank", "width=600,height=400");

    // Show instructions in a toast
    toast({
      title: "Twitter Poll Instructions",
      description:
        "After posting, click the poll icon (📊) in Twitter to add a Yes/No poll to your tweet!",
      variant: "default",
    });
  };

  // --- Animated Hero Section (matching Governance.tsx style) ---
  const HeroSection = (
    <div className="relative min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center overflow-hidden w-full py-4 sm:py-6 md:py-8 pb-4 sm:pb-6 md:pb-8">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full">
        {/* Dark Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black"></div>

        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
              backgroundSize: "50px 50px",
              animation: "gridMove 20s linear infinite",
            }}
          ></div>
        </div>

        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gray-400/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/30"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-2 sm:px-4 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-2xl leading-tight">
            Create Blapposal
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg backdrop-blur-sm border border-gray-500/30">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base font-semibold">
              Drop Your Ideas
            </span>
          </div>
        </div>

        <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg mb-4 sm:mb-6 px-2">
          Time to unleash your inner governance degenerate. Drop half-baked proposals, 
          spam YES votes, and steer this flaming rocket ship straight into the moon. 
          Your voice shapes the future—make it count.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
          <Button
            asChild
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
          >
            <Link to="/governance/proposals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blapposals
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold border-2 border-white/30 text-white hover:bg-white/10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/governance">Govna's Room</Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!activeWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        {HeroSection}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert className="mt-8 bg-red-900/20 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to connect your wallet to create a proposal. Please
                connect your wallet and try again.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {HeroSection}
      {/* Main Content */}
      <div className="container mx-auto px-4 space-y-8">
        {/* Section Divider and Header */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-2xl font-bold text-white tracking-tight animate-fade-in">
            Create Blapposal
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-8">
            <Card className="bg-white/5 border border-white/10 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 animate-fade-in rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5" />
                  New Blapposal
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
          <CreateProposalPreview
            watchedValues={watchedValues}
            activeWallet={activeWallet}
          />
        </div>
      </div>

      {/* Proposal Creation Success Modal */}
      <RoundedModal
        open={creationSuccessDialogOpen}
        onOpenChange={setCreationSuccessDialogOpen}
      >
        <div className="max-w-md w-full p-6 bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-3xl">
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              Proposal Created Successfully!
            </h2>
          </div>
          <div className="space-y-4 text-center">
            {/* Success Animation */}
            <div className="flex justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Your proposal is now live!
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                "{createdProposalData?.title}"
              </p>
              <p className="text-xs text-gray-400">
                The proposal has been created and is now pending activation.
                Share it with the community to help get it activated!
              </p>
            </div>

            {/* Share Section */}
            <div className="space-y-3">
              <div className="text-xs sm:text-sm text-gray-300">
                Share this proposal with the community:
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleShareWithPollInstructions}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs sm:text-sm"
                >
                  <Twitter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Share with Poll Instructions
                </Button>
                <Button
                  onClick={handleShareOnTwitter}
                  variant="outline"
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Share Simple Tweet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreationSuccessDialogOpen(false);
                    if (createdProposalData) {
                      navigate(`/governance/proposals/${createdProposalData.id}`);
                    }
                  }}
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  View Proposal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCreationSuccessDialogOpen(false)}
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
              <div className="text-xs text-blue-300 font-medium mb-1">
                What's Next?
              </div>
              <ul className="text-xs text-blue-400/70 space-y-1 text-left">
                <li>• Share this proposal to gather community support</li>
                <li>• Community members can help activate it</li>
                <li>• Once activated, voting will begin</li>
              </ul>
            </div>
          </div>
        </div>
      </RoundedModal>
    </div>
  );
};

export default CreateProposal;
