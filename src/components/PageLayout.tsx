
import React from "react";
import OnboardingBanner from "@/components/OnboardingBanner";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbItemType = {
  to?: string;
  label: string;
  isCurrentPage?: boolean;
};

interface PageLayoutProps {
  breadcrumb?: BreadcrumbItemType[];
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ breadcrumb, children }) => (
  <div className="min-h-screen w-full bg-gradient-to-br from-[#1A1F2C] via-[#131522] to-[#0c0c13] flex flex-col items-center pt-12 relative">
    <OnboardingBanner />
    {/* Breadcrumb */}
    {breadcrumb && (
      <div className="w-full max-w-6xl pt-2 px-2 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={item.label}>
                <BreadcrumbItem>
                  {item.to && !item.isCurrentPage ? (
                    <BreadcrumbLink
                      href={item.to}
                      className={item.label === "[BUIDL]"
                        ? "text-[#1EAEDB] font-bold tracking-tight hover:text-[#42c6f5] transition"
                        : "font-semibold text-lg text-white"}
                    >
                      {item.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage
                      className={
                        item.label === "[BUIDL]"
                          ? "text-[#1EAEDB] font-bold tracking-tight"
                          : "font-semibold text-lg text-white"
                      }
                    >
                      {item.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {idx !== breadcrumb.length - 1 && (
                  <BreadcrumbSeparator>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-3.5"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="#1EAEDB"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 3 11 8 6 13" />
                    </svg>
                  </BreadcrumbSeparator>
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {/* Add spacing after breadcrumb */}
        <div className="mb-8" />
      </div>
    )}
    <div className="w-full max-w-6xl flex flex-col items-center justify-start px-2 sm:px-6">
      {children}
    </div>
  </div>
);

export default PageLayout;

