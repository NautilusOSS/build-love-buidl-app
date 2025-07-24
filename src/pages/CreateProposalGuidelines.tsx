import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import React from "react";

const CreateProposalGuidelines: React.FC = () => (
  <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
    <Collapsible defaultOpen={typeof window !== 'undefined' ? window.innerWidth >= 1024 : true}>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 group">
            <CardTitle className="text-white">Proposal Guidelines</CardTitle>
            <span className="transition-transform group-data-[state=open]:rotate-180">
              <ChevronDown className="h-5 w-5 text-white" />
            </span>
          </button>
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent asChild>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-white">Title Requirements</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Maximum 64 characters</li>
              <li>• Clear and descriptive</li>
              <li>• Avoid technical jargon</li>
            </ul>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-white">Description Requirements</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Maximum 512 characters</li>
              <li>• Explain the proposal clearly</li>
              <li>• Include rationale and expected outcomes</li>
              <li>• Consider potential impacts</li>
            </ul>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-white">Proposal Process</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Proposals require activation by voters</li>
              <li>• Voting period: 7 days</li>
              <li>• Quorum: 1,000 tokens</li>
              <li>• Execution delay: 24 hours</li>
            </ul>
          </div>
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
);

export default CreateProposalGuidelines; 