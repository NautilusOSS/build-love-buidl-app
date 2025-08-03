import React from "react";
import { NetworkId } from "@txnlab/use-wallet-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface NetworkSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  networkSettings: { [key in NetworkId]: boolean };
  onNetworkSettingsChange: (settings: { [key in NetworkId]: boolean }) => void;
  onRefreshBalances: () => void;
}

const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  open,
  onOpenChange,
  networkSettings,
  onNetworkSettingsChange,
  onRefreshBalances,
}) => {
  const handleNetworkToggle = (networkId: NetworkId, checked: boolean) => {
    const newSettings = {
      ...networkSettings,
      [networkId]: checked,
    };
    onNetworkSettingsChange(newSettings);
    onRefreshBalances();
  };

  const handleResetToDefault = () => {
    const defaultSettings = {
      [NetworkId.LOCALNET]: true,
      [NetworkId.TESTNET]: true,
      [NetworkId.MAINNET]: false,
      [NetworkId.VOIMAIN]: false,
    } as { [key in NetworkId]: boolean };
    onNetworkSettingsChange(defaultSettings);
    onRefreshBalances();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Network Settings</DialogTitle>
          <DialogDescription>
            Configure which networks to fetch balances from. Only enabled networks will be fetched.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-card-foreground">Localnet</span>
              </div>
              <input
                type="checkbox"
                checked={networkSettings[NetworkId.LOCALNET]}
                onChange={(e) => handleNetworkToggle(NetworkId.LOCALNET, e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-card-foreground">
                  Algorand Testnet
                </span>
              </div>
              <input
                type="checkbox"
                checked={networkSettings[NetworkId.TESTNET]}
                onChange={(e) => handleNetworkToggle(NetworkId.TESTNET, e.target.checked)}
                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-card-foreground">
                  Algorand Mainnet
                </span>
              </div>
              <input
                type="checkbox"
                checked={networkSettings[NetworkId.MAINNET]}
                onChange={(e) => handleNetworkToggle(NetworkId.MAINNET, e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-card-foreground">Voi Mainnet</span>
              </div>
              <input
                type="checkbox"
                checked={networkSettings[NetworkId.VOIMAIN]}
                onChange={(e) => handleNetworkToggle(NetworkId.VOIMAIN, e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <button
              onClick={handleResetToDefault}
              className="text-sm text-blue-500 hover:text-blue-400 underline"
            >
              Reset to Default
            </button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Only enabled networks will be fetched for balances. This helps
            reduce API calls and focus on the networks you need.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NetworkSettingsModal; 