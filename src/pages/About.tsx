import React from "react";
import PageLayout from "@/components/PageLayout";

/*
const breadCrumb = [
  {
    to: "/",
    label: "[BUIDL]",
  },
  {
    label: "About",
    isCurrentPage: true,
  },
];
*/

const About: React.FC = () => {
  return (
    <PageLayout>
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About <span className="text-[#1EAEDB]">Pact</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Empowering the ecosystem through decentralized protocol development
            with Power Token ($POW) as the governance token for Humble on Voi
            and Pact on Algorand.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-2xl font-bold text-[#1EAEDB] mb-4">
              Power Token ($POW)
            </h3>
            <p className="text-gray-300 leading-relaxed">
              The governance token for the Pact Protocol and Humble, designed to
              drive community decision-making and support long-term protocol
              growth across a multi-chain ecosystem.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-2xl font-bold text-[#1EAEDB] mb-4">
              Community Driven
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Pact is more than just a protocol—it's a community of builders,
              creators, and innovators who believe in the power of decentralized
              technology to shape the future of DeFi.
            </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Our Mission
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1EAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Build</h4>
              <p className="text-gray-300">
                Develop innovative DeFi protocols and tools that empower users
                and drive ecosystem growth.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1EAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Connect</h4>
              <p className="text-gray-300">
                Bridge different blockchain ecosystems and create seamless
                experiences across multiple chains.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1EAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Grow</h4>
              <p className="text-gray-300">
                Foster a sustainable and thriving community that drives
                innovation and adoption in the DeFi space.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Tokenomics
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Total Supply
              </h4>
              <p className="text-gray-300 mb-4">
                1,000,000,000 $POW tokens designed for long-term sustainability
                and community-driven protocol growth.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Airdrop
              </h4>
              <p className="text-gray-300 mb-4">
                50,000,000 $POW (5% of supply) distributed to historic users of
                Pact & Humble, and NFT holders.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Multi-Chain Support
              </h4>
              <p className="text-gray-300 mb-4">
                Built to support growth across multiple blockchain ecosystems,
                starting with Algorand and expanding to other chains.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Unified Platform
              </h4>
              <p className="text-gray-300 mb-4">
                Humble will migrate under the Pact brand to provide a cohesive
                user experience across all products and services.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Cross-Chain Governance
          </h2>
          <p className="text-gray-300 text-center mb-8 max-w-3xl mx-auto">
            $POW token holders participate in decentralized governance across both VOI and ALGO networks. 
            Proposals are voted on simultaneously across both chains, ensuring decisions reflect the entire ecosystem.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Cross-Chain Process
              </h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-[#1EAEDB] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-white">1</span>
                  </div>
                  <p>Proposals created on either VOI or ALGO are automatically synchronized to both networks</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-[#1EAEDB] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-white">2</span>
                  </div>
                  <p>Activation threshold must be met on either network to activate voting on both chains</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-[#1EAEDB] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-white">3</span>
                  </div>
                  <p>Voting runs concurrently on both networks with independent vote totals</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-[#1EAEDB] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-white">4</span>
                  </div>
                  <p>Each network finalizes independently based on its own vote totals</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Network Features
              </h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#1EAEDB] rounded-full"></div>
                  <p>Identical AVM (Algorand Virtual Machine) on both networks</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#1EAEDB] rounded-full"></div>
                  <p>Aramid Bridge enables liquid token transfers between networks</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#1EAEDB] rounded-full"></div>
                  <p>Locked tokens provide voting power on each network independently</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#1EAEDB] rounded-full"></div>
                  <p>No network priority - both VOI and ALGO are equal participants</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#1EAEDB] rounded-full"></div>
                  <p>Smart contracts are bytecode-compatible across networks</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <h5 className="text-lg font-semibold text-[#1EAEDB] mb-2">Supported Networks</h5>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• VOI Network - Newer AVM blockchain</li>
                <li>• ALGO Network - Original Algorand</li>
                <li>• Identical smart contract execution</li>
                <li>• Cross-chain proposal synchronization</li>
                <li>• Future AVM networks supported</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <h5 className="text-lg font-semibold text-[#1EAEDB] mb-2">Asset Management</h5>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Liquid tokens bridgeable via Aramid</li>
                <li>• Locked tokens network-specific</li>
                <li>• Vote power based on locked tokens</li>
                <li>• No double voting across networks</li>
                <li>• Choose preferred network to participate</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <h5 className="text-lg font-semibold text-[#1EAEDB] mb-2">User Participation</h5>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Bridge liquid tokens to preferred network</li>
                <li>• Lock tokens for voting power</li>
                <li>• Consistent voting experience across networks</li>
                <li>• Participate on one or both networks</li>
                <li>• Independent finalization per network</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1EAEDB]/5 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
            <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3 text-center">
              Cross-Chain Bridge Integration
            </h4>
            <p className="text-gray-300 text-center mb-4">
              The Aramid Bridge serves as the Liquid Asset Bridge (LAB) enabling seamless transfer of governance tokens between VOI and ALGO networks, 
              allowing users to participate in governance on their preferred network while maintaining the security and integrity of the voting process.
            </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mt-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Governance Flow
          </h2>
          <p className="text-gray-300 text-center mb-8 max-w-3xl mx-auto">
            The Pact governance system follows a structured process that ensures transparency, 
            community participation, and secure execution of proposals across both VOI and ALGO networks.
          </p>
          
          <div className="space-y-8">
            {/* Proposal Creation */}
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#1EAEDB] rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-white">1</span>
                </div>
                <h4 className="text-2xl font-semibold text-[#1EAEDB]">Proposal Creation</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Requirements</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Minimum 100,000 $POW tokens locked</li>
                    <li>• Proposal must be well-documented</li>
                    <li>• Clear execution parameters</li>
                    <li>• Community discussion period</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Process</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Submit proposal on either network</li>
                    <li>• Automatic sync to both chains</li>
                    <li>• 48-hour discussion period</li>
                    <li>• Community feedback integration</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Activation Phase */}
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#1EAEDB] rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-white">2</span>
                </div>
                <h4 className="text-2xl font-semibold text-[#1EAEDB]">Activation Phase</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Activation Threshold</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• 5% of total supply must vote</li>
                    <li>• Threshold met on either network</li>
                    <li>• Activates voting on both chains</li>
                    <li>• 7-day voting period begins</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Voting Power</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Based on locked token amount</li>
                    <li>• 1 token = 1 vote</li>
                    <li>• Tokens locked for minimum 7 days</li>
                    <li>• No double voting across networks</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Voting Period */}
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#1EAEDB] rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-white">3</span>
                </div>
                <h4 className="text-2xl font-semibold text-[#1EAEDB]">Voting Period</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Voting Options</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Yes - Approve the proposal</li>
                    <li>• No - Reject the proposal</li>
                    <li>• No abstain option - simply don't vote</li>
                    <li>• Can only vote once per proposal</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Cross-Chain Voting</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Vote on preferred network</li>
                    <li>• Independent vote tallies</li>
                    <li>• Real-time vote tracking</li>
                    <li>• Transparent vote counting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Execution */}
            <div className="bg-gradient-to-br from-[#1EAEDB]/10 to-transparent rounded-xl p-6 border border-[#1EAEDB]/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#1EAEDB] rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-white">4</span>
                </div>
                <h4 className="text-2xl font-semibold text-[#1EAEDB]">Execution</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Success Criteria</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Majority of votes must be "Yes"</li>
                    <li>• Minimum quorum maintained</li>
                    <li>• Each network finalizes independently</li>
                    <li>• Execution after 24-hour delay</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-lg font-semibold text-white mb-2">Implementation</h5>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Automated execution on both networks</li>
                    <li>• Smart contract parameter updates</li>
                    <li>• Cross-chain synchronization</li>
                    <li>• Community notification system</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-500/10 to-transparent rounded-xl p-6 border border-green-500/20">
              <h5 className="text-lg font-semibold text-green-400 mb-2">Timeline</h5>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Day 1-2: Discussion period</li>
                <li>• Day 3-9: Voting period</li>
                <li>• Day 10: Results finalized</li>
                <li>• Day 11: Execution (if passed)</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/10 to-transparent rounded-xl p-6 border border-yellow-500/20">
              <h5 className="text-lg font-semibold text-yellow-400 mb-2">Security</h5>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Multi-signature execution</li>
                <li>• Time-lock mechanisms</li>
                <li>• Emergency pause capability</li>
                <li>• Cross-chain verification</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl p-6 border border-purple-500/20">
              <h5 className="text-lg font-semibold text-purple-400 mb-2">Transparency</h5>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Public vote tracking</li>
                <li>• Real-time proposal status</li>
                <li>• On-chain verification</li>
                <li>• Community dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mt-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Why Choose Pact?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Innovation
              </h4>
              <p className="text-gray-300 mb-4">
                Cutting-edge DeFi protocols and tools that push the boundaries
                of what's possible in decentralized finance.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Community
              </h4>
              <p className="text-gray-300 mb-4">
                A vibrant and engaged community of developers, users, and
                enthusiasts driving the future of DeFi.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Sustainability
              </h4>
              <p className="text-gray-300 mb-4">
                Long-term focused approach with sustainable tokenomics and
                community-driven development.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Accessibility
              </h4>
              <p className="text-gray-300 mb-4">
                User-friendly interfaces and seamless experiences that make DeFi
                accessible to everyone.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mt-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Try Our Apps
          </h2>
          <p className="text-gray-300 text-center mb-8 max-w-2xl mx-auto">
            Experience the power of decentralized finance with our innovative
            protocols built for the Algorand and Voi ecosystems.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl p-6 border border-[#1EAEDB]/20 hover:border-[#1EAEDB]/40 transition-all duration-300">
              <h3 className="text-2xl font-bold text-[#1EAEDB] mb-3">Pact</h3>
              <p className="text-gray-300 mb-4">
                Advanced DeFi protocol on Algorand offering innovative trading
                and liquidity solutions with community-driven governance.
              </p>
              <a
                href="https://app.pact.fi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-[#1EAEDB] text-white font-semibold rounded-lg hover:bg-[#1EAEDB]/80 transition-colors duration-200"
              >
                Launch Pact
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
            <div className="bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl p-6 border border-[#1EAEDB]/20 hover:border-[#1EAEDB]/40 transition-all duration-300">
              <h3 className="text-2xl font-bold text-[#1EAEDB] mb-3">Humble</h3>
              <p className="text-gray-300 mb-4">
                Revolutionary DeFi platform on Voi providing seamless trading
                experiences and innovative financial products.
              </p>
              <a
                href="https://app.humble.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-[#1EAEDB] text-white font-semibold rounded-lg hover:bg-[#1EAEDB]/80 transition-colors duration-200"
              >
                Launch Humble
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default About;
