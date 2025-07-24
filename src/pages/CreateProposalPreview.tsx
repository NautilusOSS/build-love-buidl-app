import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import React from "react";

type Props = {
  watchedValues: any;
  activeWallet: any;
};

const CreateProposalPreview: React.FC<Props> = ({ watchedValues, activeWallet }) => (
  <div className="space-y-8">
    <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-white">
              {watchedValues.title || "Proposal Title"}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2 py-1 rounded-full font-semibold">
                {watchedValues.category || "Category"}
              </span>
              <div className="text-sm text-muted-foreground mt-1">
                Created by {activeWallet?.addresses?.[0] ? `${activeWallet.addresses[0].slice(0, 6)}...${activeWallet.addresses[0].slice(-4)}` : "Your Address"}
              </div>
            </div>
          </div>
          <Separator />
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-line text-white">
              {watchedValues.description || "Proposal description will appear here..."}
            </p>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium text-white">Pending</div>
            </div>
            <div>
              <div className="text-muted-foreground">Votes</div>
              <div className="font-medium text-white">0</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    {/* Transaction Info */}
    <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white">Transaction Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Network</div>
            <div className="font-medium text-white">Algorand Mainnet</div>
          </div>
          <div>
            <div className="text-muted-foreground">Estimated Fee</div>
            <div className="font-medium text-white">~0.001 ALGO</div>
          </div>
        </div>
        <Alert className="bg-green-900/20 border-green-500/30">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Creating a proposal requires a small transaction fee. Make sure you have sufficient ALGO balance.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  </div>
);

export default CreateProposalPreview; 