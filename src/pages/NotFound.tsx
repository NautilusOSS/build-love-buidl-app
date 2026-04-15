import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export type NotFoundProps = {
  /** Main message under the 404 heading (default: generic not-found copy). */
  heading?: string;
  /** Optional secondary line (e.g. deleted resource). */
  subheading?: string;
  /** When true, skip the default console error (embedded “resource missing” views). */
  quiet?: boolean;
};

const NotFound = ({
  heading,
  subheading,
  quiet = false,
}: NotFoundProps = {}) => {
  const location = useLocation();

  useEffect(() => {
    if (quiet) return;
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname, quiet]);

  return (
    <div className="grant-shell">
      <div className="grant-shell-header">
        <div className="container mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="grant-title-sub mb-2">Error</p>
            <h1 className="grant-title text-3xl sm:text-4xl">404</h1>
          </div>
          <Link to="/" className="grant-link text-sm shrink-0">
            ← Grant dashboard
          </Link>
        </div>
        <div className="grant-hairline" />
      </div>

      <div className="container mx-auto px-6 py-12 flex justify-center">
        <Card className="grant-panel w-full max-w-md border shadow-none">
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
            <p className="text-lg text-slate-200 leading-snug">
              {heading ?? "Oops! Page not found"}
            </p>
            {subheading ? (
              <p className="text-sm text-slate-500 leading-relaxed">
                {subheading}
              </p>
            ) : null}
            <div className="pt-2">
              <Button asChild className="grant-btn-primary w-full sm:w-auto">
                <Link to="/" className="inline-flex items-center justify-center gap-2">
                  <Home className="w-4 h-4 shrink-0" />
                  Return to dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
