import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Trophy, Clock, Users, Crown } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedFooter } from "@/components/shared-footer";
import LtrNum from "@/components/ui/ltr-num";

interface Challenge {
  id: number;
  title: string;
  description: string;
  theme: string | null;
  start_date: string;
  end_date: string;
  winner_id: string | null;
  winner_entry_id: number | null;
  created_at: string;
  entryCount: number;
}

function getTimeRemaining(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} يوم و ${hours} ساعة`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} ساعة و ${minutes} دقيقة`;
}

export default function Challenges() {
  useDocumentTitle("تحديات الكتابة — قلم AI", "شارك في تحديات الكتابة الأسبوعية على QalamAI وتنافس مع كتّاب عرب مبدعين.");

  const { data: challenges, isLoading } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const activeChallenges = challenges?.filter(c => new Date(c.end_date) > new Date()) || [];
  const pastChallenges = challenges?.filter(c => new Date(c.end_date) <= new Date()) || [];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-start">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-home">
              <ArrowRight className="w-4 h-4" />
              الرئيسية
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold" data-testid="text-challenges-title">تحديات الكتابة</h1>
          </div>
          <p className="text-muted-foreground" data-testid="text-challenges-subtitle">شارك في التحديات الأسبوعية وأظهر إبداعك</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            {activeChallenges.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-active-section">
                  <Clock className="w-5 h-5 text-green-500" /> تحديات نشطة
                </h2>
                {activeChallenges.map(ch => {
                  const remaining = getTimeRemaining(ch.end_date);
                  return (
                    <Link key={ch.id} href={`/challenges/${ch.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`card-challenge-${ch.id}`}>
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h3 className="font-serif font-bold text-lg" data-testid={`text-challenge-title-${ch.id}`}>{ch.title}</h3>
                              {ch.theme && <Badge variant="secondary" className="text-xs">{ch.theme}</Badge>}
                            </div>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400 shrink-0">
                              نشط
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{ch.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {remaining && (
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {remaining}</span>
                            )}
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> <LtrNum>{ch.entryCount}</LtrNum> مشاركة</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {pastChallenges.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-past-section">
                  <Crown className="w-5 h-5 text-amber-500" /> تحديات سابقة
                </h2>
                {pastChallenges.map(ch => (
                  <Link key={ch.id} href={`/challenges/${ch.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-80" data-testid={`card-challenge-past-${ch.id}`}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-serif font-bold text-lg">{ch.title}</h3>
                          <Badge variant="outline" className="shrink-0">منتهي</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{ch.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> <LtrNum>{ch.entryCount}</LtrNum> مشاركة</span>
                          {ch.winner_id && <span className="flex items-center gap-1 text-yellow-600"><Crown className="w-3.5 h-3.5" /> تم اختيار الفائز</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {(!challenges || challenges.length === 0) && (
              <div className="text-center py-16 space-y-4" data-testid="challenges-empty">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">لا توجد تحديات حالياً</p>
                <p className="text-sm text-muted-foreground">ترقبوا التحديات القادمة!</p>
              </div>
            )}
          </>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}
