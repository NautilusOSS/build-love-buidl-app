import React from 'react';
import { useFeatureFlags } from '@/constants/featureFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ExternalLink, ArrowRightLeft } from 'lucide-react';

const TransferFeatureDemo: React.FC = () => {
  const {
    isTransferEnabled,
    isInternalTransferEnabled,
    isExternalTransferEnabled,
  } = useFeatureFlags();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Transfer Feature Flags Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall Transfer Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Overall Transfer</h3>
                <Badge variant={isTransferEnabled() ? "default" : "secondary"}>
                  {isTransferEnabled() ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Controls all transfer functionality
              </p>
            </div>

            {/* Internal Transfer Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Internal Transfer</h3>
                <Badge variant={isInternalTransferEnabled() ? "default" : "secondary"}>
                  {isInternalTransferEnabled() ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Transfers between your own buckets
              </p>
            </div>

            {/* External Transfer Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">External Transfer</h3>
                <Badge variant={isExternalTransferEnabled() ? "default" : "secondary"}>
                  {isExternalTransferEnabled() ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Transfers to external addresses
              </p>
            </div>
          </div>

          {/* Feature Demo Buttons */}
          <div className="space-y-3">
            <h4 className="font-medium">Feature Demo:</h4>
            
            {isTransferEnabled() ? (
              <div className="space-y-2">
                {isInternalTransferEnabled() && (
                  <Button className="w-full justify-start" variant="outline">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Internal Transfer (Available)
                  </Button>
                )}
                
                {isExternalTransferEnabled() && (
                  <Button className="w-full justify-start" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    External Transfer (Available)
                  </Button>
                )}
                
                {!isInternalTransferEnabled() && (
                  <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
                    Internal Transfer (Disabled)
                  </div>
                )}
                
                {!isExternalTransferEnabled() && (
                  <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
                    External Transfer (Disabled)
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                All transfer features are currently disabled
              </div>
            )}
          </div>

          {/* Environment Variables Info */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Environment Variables:</h4>
            <div className="space-y-1 text-sm">
              <code className="bg-background px-2 py-1 rounded">
                VITE_FEATURE_TRANSFER_ENABLED=true
              </code>
              <br />
              <code className="bg-background px-2 py-1 rounded">
                VITE_FEATURE_TRANSFER_INTERNAL=true
              </code>
              <br />
              <code className="bg-background px-2 py-1 rounded">
                VITE_FEATURE_TRANSFER_EXTERNAL=true
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Set to "false" to disable specific features
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferFeatureDemo; 