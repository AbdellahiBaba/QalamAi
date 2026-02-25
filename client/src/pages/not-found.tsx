import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background" dir="rtl">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-2xl font-bold" data-testid="text-404">الصفحة غير موجودة</h1>
          <p className="text-sm text-muted-foreground">
            يبدو أنك ضللت الطريق. لنعُد إلى الصفحة الرئيسية
          </p>
          <Link href="/">
            <Button data-testid="button-go-home">العودة للرئيسية</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
