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
          <span className="text-sm text-muted-foreground">Connected Wallet:</span>
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
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl"
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
                      className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl"
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
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl w-full py-2 px-3"
                  >
                    <option value="" disabled>Select a category</option>
                    <option value="Treasury">Treasury</option>
                    <option value="Governance">Governance</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Community">Community</option>
                    <option value="Development">Development</option>
                    <option value="Security">Security</option>
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
              className="flex-1 rounded-full flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Proposal...
                </>
              ) : (
                "Create Proposal"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default CreateProposalForm; 