import React from "react";
import PageLayout from "@/components/PageLayout";
import { handleExternalLink } from "@/utils/externalLinks";

const About: React.FC = () => {
  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        {/* Hero Section */}
        <div className="container mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#1EAEDB] to-[#ff6600] bg-clip-text text-transparent">
              About Blapu
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              The ultimate memecoin on Algorand, built for the community, by the
              community. No team tokens, no presale, just pure meme energy.
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Our Mission
            </h2>
            <p className="text-gray-300 text-center mb-8 max-w-4xl mx-auto">
              To create the most vibrant and engaged community in the Algorand
              ecosystem while maintaining the purest form of decentralized
              governance. We believe in fair launches, community-driven
              development, and the power of memes to bring people together.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Community First
                </h4>
                <p className="text-gray-300 mb-4">
                  Every decision is made with the community in mind. No team
                  tokens, no unfair advantages, just pure community governance.
                </p>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Innovation
                </h4>
                <p className="text-gray-300 mb-4">
                  Pushing the boundaries of what's possible on Algorand with
                  cutting-edge DeFi protocols and innovative tokenomics.
                </p>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Transparency
                </h4>
                <p className="text-gray-300 mb-4">
                  Complete transparency in all aspects of the project, from
                  tokenomics to development decisions.
                </p>
              </div>
            </div>
          </div>

          {/* Tokenomics Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Tokenomics
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl border border-[#1EAEDB]/20">
                <div className="text-3xl font-bold text-[#1EAEDB] mb-2">
                  1,000,000
                </div>
                <div className="text-gray-300">Total Supply</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl border border-[#1EAEDB]/20">
                <div className="text-3xl font-bold text-[#1EAEDB] mb-2">0%</div>
                <div className="text-gray-300">Team Tokens</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl border border-[#1EAEDB]/20">
                <div className="text-3xl font-bold text-[#1EAEDB] mb-2">100%</div>
                <div className="text-gray-300">Community Owned</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl border border-[#1EAEDB]/20">
                <div className="text-3xl font-bold text-[#1EAEDB] mb-2">∞</div>
                <div className="text-gray-300">Potential</div>
              </div>
            </div>
          </div>

          {/* Technology Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Built on Algorand
            </h2>
            <p className="text-gray-300 text-center mb-8 max-w-3xl mx-auto">
              Leveraging Algorand's lightning-fast transactions, minimal fees, and
              carbon-negative blockchain to create the ultimate memecoin
              experience.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Speed
                </h4>
                <p className="text-gray-300 mb-4">
                  Instant finality with 4.5-second block times and immediate
                  transaction confirmation.
                </p>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Security
                </h4>
                <p className="text-gray-300 mb-4">
                  Pure proof-of-stake consensus with no forking, ensuring maximum
                  security and reliability.
                </p>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Sustainability
                </h4>
                <p className="text-gray-300 mb-4">
                  Carbon-negative blockchain that's environmentally friendly and
                  future-proof.
                </p>
              </div>
            </div>
          </div>

          {/* Community Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Community Values
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                  Inclusivity
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

          {/* Apps Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mt-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Try Our Apps
            </h2>
            <p className="text-gray-300 text-center mb-8 max-w-2xl mx-auto">
              Experience the blapu of decentralized finance with our innovative
              protocols built for the Algorand and Voi ecosystems.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl p-6 border border-[#1EAEDB]/20 hover:border-[#1EAEDB]/40 transition-all duration-300">
                <h3 className="text-2xl font-bold text-[#1EAEDB] mb-3">Pact</h3>
                <p className="text-gray-300 mb-4">
                  Advanced DeFi protocol on Algorand offering innovative trading
                  and liquidity solutions with community-driven governance.
                </p>
                <button
                  onClick={() => handleExternalLink('https://app.pact.fi', 'Pact')}
                  className="inline-flex items-center px-6 py-3 bg-[#1EAEDB] text-white font-semibold rounded-lg hover:bg-[#1EAEDB]/80 transition-colors duration-200 cursor-pointer"
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
                </button>
              </div>
              <div className="bg-gradient-to-br from-[#1EAEDB]/20 to-[#1EAEDB]/5 rounded-xl p-6 border border-[#1EAEDB]/20 hover:border-[#1EAEDB]/40 transition-all duration-300">
                <h3 className="text-2xl font-bold text-[#1EAEDB] mb-3">Humble</h3>
                <p className="text-gray-300 mb-4">
                  Revolutionary DeFi platform on Voi providing seamless trading
                  experiences and innovative financial products.
                </p>
                <button
                  onClick={() => handleExternalLink('https://app.humble.sh', 'Humble')}
                  className="inline-flex items-center px-6 py-3 bg-[#1EAEDB] text-white font-semibold rounded-lg hover:bg-[#1EAEDB]/80 transition-colors duration-200 cursor-pointer"
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
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default About;
