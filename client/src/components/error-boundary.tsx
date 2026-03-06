import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMode?: "page" | "inline";
  label?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackMode === "inline") {
        return (
          <Card dir="rtl" data-testid="error-boundary-inline">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {this.props.label
                    ? `حدث خطأ في تحميل ${this.props.label}`
                    : "حدث خطأ في تحميل هذا القسم"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => this.setState({ hasError: false })}
                  data-testid="button-retry-section"
                >
                  <RefreshCw className="w-3.5 h-3.5 ml-1" />
                  إعادة المحاولة
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold font-serif">حدث خطأ غير متوقع</h1>
            <p className="text-muted-foreground">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
            </p>
            <Button
              onClick={() => window.location.reload()}
              data-testid="button-reload"
            >
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
