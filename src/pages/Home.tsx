
import React from "react";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#131522] to-[#0c0c13] px-4">
      <div className="bg-[#232638cc] rounded-3xl shadow-2xl p-10 md:p-16 max-w-2xl w-full">
        <h1 className="text-gradient-primary text-4xl font-extrabold mb-4 drop-shadow-xl">
          Welcome to Your Home Page
        </h1>
        <p className="text-white/90 text-lg mb-6 max-w-xl">
          This is your new Home page. Add features, links, or dashboard widgets as you build out your app. Use the sidebar to navigate between Home and Dashboard.
        </p>
        <div className="border-t border-white/10 pt-6 text-white/80">
          <span className="font-bold">Pro tip:</span> You can quickly access the Dashboard, Bounties, and more from the navigation sidebar.
        </div>
      </div>
    </div>
  );
};

export default Home;
