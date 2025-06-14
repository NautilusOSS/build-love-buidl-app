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
