import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React from "react";

type Props = {
  form: any;
  isSubmitting: boolean;
  handleSubmit: (data: any) => void;
  activeWallet: any;
};

const CreateProposalForm: React.FC<Props> = ({ form, isSubmitting, handleSubmit, activeWallet }) => {
  return (
    <>
      {activeWallet?.addresses?.[0] ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-400">Connected Wallet:</span>
          <span className="inline-block bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2 py-1 rounded-full font-semibold">
            {`${activeWallet.addresses[0].slice(0, 6)}...${activeWallet.addresses[0].slice(-4)}`}
          </span>
        </div>
      ) : (
        <div className="mb-4 text-sm text-red-400">No wallet connected</div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => {
              const charsLeft = 64 - field.value.length;
              const counterClass = charsLeft <= 10 ?
                (charsLeft <= 0 ? "text-red-500 font-bold" : "text-yellow-400 font-semibold") :
                "text-muted-foreground";
              return (
                <FormItem>
                  <FormLabel className="text-white">Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter proposal title..." 
                      maxLength={64}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50"
                      {...field} 
                    />
                  </FormControl>
                  <div className={`text-sm ${counterClass}`}>
                    {field.value.length}/64 characters
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => {
              const charsLeft = 512 - field.value.length;
              const counterClass = charsLeft <= 10 ?
                (charsLeft <= 0 ? "text-red-500 font-bold" : "text-yellow-400 font-semibold") :
                "text-muted-foreground";
              return (
                <FormItem>
                  <FormLabel className="text-white">Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your proposal in detail..." 
                      className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50"
                      maxLength={512}
                      {...field} 
                    />
                  </FormControl>
                  <div className={`text-sm ${counterClass}`}>
                    {field.value.length}/512 characters
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Category *</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50 w-full py-2 px-3"
                  >
                    <option value="" disabled>Select a category</option>
                    <option value="Treasury Shenanigans">Treasury Shenanigans</option>
                    <option value="Number Go Up (Tokenomics)">Number Go Up (Tokenomics)</option>
                    <option value="Govna Stuff (Governance)">Govna Stuff (Governance)</option>
                    <option value="Protocol Wizardry">Protocol Wizardry</option>
                    <option value="Pacts with Other Degens (Partnerships)">Pacts with Other Degens (Partnerships)</option>
                    <option value="Hype Machine (Marketing)">Hype Machine (Marketing)</option>
                    <option value="Science or Scam? (Experimental)">Science or Scam? (Experimental)</option>
                    <option value="Buildoors' Corner (Tooling)">Buildoors' Corner (Tooling)</option>
                    <option value="Sprouting Ideas (New Stuff)">Sprouting Ideas (New Stuff)</option>
                    <option value="Do Tasks, Get Bags (Bounties)">Do Tasks, Get Bags (Bounties)</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 rounded-2xl flex items-center justify-center bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Blapposal...
                </>
              ) : (
                "Create Blapposal"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default CreateProposalForm; 