import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_VERSION } from "@/constants/version";

const Changelog: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Changelog</h1>
        <p className="text-gray-400">Track the evolution of the Blapu app</p>
      </div>

      {/* Current Version */}
      <Card className="mb-8 border-orange-500/50 bg-gradient-to-br from-gray-900 to-black">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-orange-400 text-2xl font-bold">
              Version {APP_VERSION}
            </CardTitle>
            <Badge variant="outline" className="border-orange-500 text-orange-400">
              Latest
            </Badge>
          </div>
          <p className="text-gray-400 text-sm">Released on August 3rd, 2025</p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Added Section */}
          <div>
            <h3 className="text-green-400 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Added
            </h3>
            <div className="space-y-3 ml-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
                <h4 className="text-white font-semibold mb-2">Blapu App Initial Implementation</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Complete application setup with governance, store, and wallet functionality
                </p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                  <li>• Governance system with proposal creation and voting</li>
                  <li>• Store page with product listings and purchase functionality</li>
                  <li>• Wallet integration with multiple Algorand wallet support</li>
                  <li>• Feature flag system for controlled feature rollout</li>
                  <li>• Network settings and configuration management</li>
                  <li>• Comprehensive UI components and styling</li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
                <h4 className="text-white font-semibold mb-2">In-App Changelog System</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Complete changelog functionality for users with beautiful UI design
                </p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                  <li>• Dedicated changelog page with beautiful UI design</li>
                  <li>• Color-coded sections (Added, Fixed, Changed, Technical Details, Impact)</li>
                  <li>• Version display in sidebar footer</li>
                  <li>• Changelog only visible when wallet is connected</li>
                  <li>• Comprehensive documentation of all changes and fixes</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator className="bg-orange-500/30" />

          {/* Fixed Section */}
          <div>
            <h3 className="text-blue-400 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Fixed
            </h3>
            <div className="space-y-3 ml-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
                <h4 className="text-white font-semibold mb-2">Pera Wallet Production Build Issues</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Resolved <code className="bg-red-900/50 px-1 rounded text-red-300">TypeError: np.from is not a function</code> and related function name mangling errors in production builds
                </p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                  <li>• Disabled minification to prevent function name mangling</li>
                  <li>• Added comprehensive Buffer polyfills for Node.js compatibility</li>
                  <li>• Implemented custom Vite plugin to transform mangled function names</li>
                  <li>• Added runtime Buffer polyfill for browser compatibility</li>
                  <li>• Enhanced TypeScript configuration to suppress external library type errors</li>
                  <li>• Updated Pera wallet library from v1.3.4 to v1.4.2</li>
                  <li>• Implemented manual chunking for wallet libraries to prevent bundling conflicts</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator className="bg-orange-500/30" />

          {/* Changed Section */}
          <div>
            <h3 className="text-yellow-400 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              Changed
            </h3>
            <div className="space-y-3 ml-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/20">
                <h4 className="text-white font-semibold mb-2">Store Page Enhancements</h4>
                <p className="text-gray-300 text-sm">Updated store functionality with improved UI and user experience</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/20">
                <h4 className="text-white font-semibold mb-2">WalletConnect Button Improvements</h4>
                <p className="text-gray-300 text-sm">Enhanced wallet connection interface and error handling</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/20">
                <h4 className="text-white font-semibold mb-2">Dependency Cleanup</h4>
                <p className="text-gray-300 text-sm">Removed unused dependencies and cleaned up package.json</p>
              </div>
            </div>
          </div>

          <Separator className="bg-orange-500/30" />

          {/* Technical Details */}
          <div>
            <h3 className="text-purple-400 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              Technical Details
            </h3>
            <div className="space-y-3 ml-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20">
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• <strong>Vite Configuration:</strong> Added manual chunking, disabled minification, and enhanced polyfills</li>
                  <li>• <strong>TypeScript:</strong> Suppressed type checking for external wallet libraries</li>
                  <li>• <strong>Buffer Polyfills:</strong> Added comprehensive Node.js Buffer support for browser environment</li>
                  <li>• <strong>Build Optimization:</strong> Separated wallet libraries into individual chunks for better error isolation</li>
                  <li>• <strong>Error Handling:</strong> Enhanced wallet connection error handling with specific error messages</li>
                  <li>• <strong>Feature Flags:</strong> Implemented comprehensive feature flag system for development control</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator className="bg-orange-500/30" />

          {/* Impact */}
          <div>
            <h3 className="text-orange-400 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
              Impact
            </h3>
            <div className="space-y-3 ml-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">Before</h4>
                    <p className="text-gray-300 text-sm">Pera wallet failed with <code className="bg-red-900/50 px-1 rounded text-red-300">np.from is not a function</code> error in production</p>
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-2">After</h4>
                    <p className="text-gray-300 text-sm">Pera wallet works correctly in both development and production environments</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-orange-500/20">
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• <strong>Performance:</strong> Slightly larger bundle size due to disabled minification, but improved reliability</li>
                    <li>• <strong>Compatibility:</strong> Enhanced browser compatibility for Node.js Buffer functions</li>
                    <li>• <strong>User Experience:</strong> Improved store interface and wallet connection experience</li>
                    <li>• <strong>Transparency:</strong> Users can now view detailed changelog and version information within the app</li>
                    <li>• <strong>Developer Experience:</strong> Comprehensive documentation of all changes and technical implementations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-8">
        <p>For detailed technical information, see the project's CHANGELOG.md file</p>
      </div>
    </div>
  );
};

export default Changelog; 