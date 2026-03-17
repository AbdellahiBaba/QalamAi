import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useLocation } from "wouter";
import { SharedNavbar } from "@/components/shared-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Users,
  BookOpen,
  Heart,
  TrendingUp,
  Coffee,
  Globe,
  BarChart3,
  ArrowUpRight,
  Star,
  Layers,
  Quote,
  GraduationCap,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import LtrNum from "@/components/ui/ltr-num";

const STORY_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

const countryCodeToName: Record<string, string> = {
  SA: "السعودية",
  AE: "الإمارات",
  EG: "مصر",
  KW: "الكويت",
  QA: "قطر",
  BH: "البحرين",
  OM: "عُمان",
  JO: "الأردن",
  LB: "لبنان",
  IQ: "العراق",
  SY: "سوريا",
  PS: "فلسطين",
  YE: "اليمن",
  LY: "ليبيا",
  TN: "تونس",
  DZ: "الجزائر",
  MA: "المغرب",
  SD: "السودان",
  MR: "موريتانيا",
  SO: "الصومال",
  DJ: "جيبوتي",
  KM: "جزر القمر",
  US: "أمريكا",
  GB: "بريطانيا",
  FR: "فرنسا",
  DE: "ألمانيا",
  CA: "كندا",
  AU: "أستراليا",
  TR: "تركيا",
  IN: "الهند",
  PK: "باكستان",
  MY: "ماليزيا",
  ID: "إندونيسيا",
  NG: "نيجيريا",
  BR: "البرازيل",
  CN: "الصين",
  JP: "اليابان",
  KR: "كوريا الجنوبية",
  IT: "إيطاليا",
  ES: "إسبانيا",
  NL: "هولندا",
  SE: "السويد",
};

function AnalyticsTopQuotes({ userId }: { userId?: string }) {
  const { data: quotes } = useQuery<any[]>({
    queryKey: ["/api/authors", userId, "top-quotes"],
    queryFn: () => fetch(`/api/authors/${userId}/top-quotes`).then(r => r.json()),
    enabled: !!userId,
    staleTime: 120_000,
  });

  if (!quotes || !Array.isArray(quotes) || quotes.length === 0) return null;

  return (
    <Card data-testid="card-analytics-top-quotes">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Quote className="w-5 h-5 text-primary/70" />
          أبرز اقتباساتك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quotes.map((q: any, idx: number) => (
          <div key={idx} className="relative pr-8 py-2 border-r-2 border-primary/20" data-testid={`analytics-quote-${idx}`}>
            <span className="absolute right-1 top-2 text-lg text-primary/25 font-serif">❝</span>
            <p className="font-serif text-sm leading-relaxed text-foreground/90" data-testid={`analytics-quote-text-${idx}`}>{q.quote_text}</p>
            <div className="flex items-center gap-2 mt-1">
              {q.project_title && (
                <span className="text-[11px] text-muted-foreground">— {q.project_title}</span>
              )}
              <Badge variant="outline" className="text-[10px]">
                <LtrNum>{q.save_count}</LtrNum> حفظ
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  useDocumentTitle("إحصائياتي — QalamAI", "تابع إحصائيات أعمالك الأدبية: المشاهدات والمتابعين والإكراميات على QalamAI.");
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"aggregate" | "per-story">("aggregate");

  if (!authLoading && !user) {
    navigate("/");
    return null;
  }

  const { data: summary, isLoading: summaryLoading } = useQuery<{
    totalViews: number;
    totalEssays: number;
    followerCount: number;
    totalReactions: number;
    topEssays: Array<{ id: number; title: string; shareToken: string | null; views: number; reactions: number }>;
    viewsThisMonth: number;
    followersThisMonth: number;
  }>({
    queryKey: ["/api/me/analytics"],
  });

  const { data: viewsSeries, isLoading: viewsLoading } = useQuery<Array<{ date: string; views: number }>>({
    queryKey: ["/api/me/analytics/views"],
  });

  const { data: viewsByStory, isLoading: viewsByStoryLoading } = useQuery<Array<{ id: number; title: string; data: Array<{ date: string; views: number }> }>>({
    queryKey: ["/api/me/analytics/views-by-story"],
    enabled: viewMode === "per-story",
  });

  const { data: followerHistory, isLoading: followersLoading } = useQuery<Array<{ week: string; count: number }>>({
    queryKey: ["/api/me/analytics/followers"],
  });

  const { data: tipsData, isLoading: tipsLoading } = useQuery<{ totalCents: number; tips: Array<{ id: number; amountCents: number; fromName: string | null; fromUserId: string | null; projectId: number | null; createdAt: string; status: string }> }>({
    queryKey: ["/api/me/analytics/tips-history"],
  });

  const { data: completionData, isLoading: completionLoading } = useQuery<Array<{ id: number; title: string; shareToken: string | null; totalChapters: number; readers: number; completions: number; completionRate: number }>>({
    queryKey: ["/api/me/analytics/completion"],
  });

  const { data: countriesData, isLoading: countriesLoading } = useQuery<Array<{ country: string; count: number }>>({
    queryKey: ["/api/me/analytics/countries"],
  });

  const formatDate = (d: string) => {
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  const formatWeek = (d: string) => {
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  const mostReadWork = summary?.topEssays?.[0];
  const totalTipsCents = tipsData?.totalCents || 0;

  const perStoryChartData = (() => {
    if (!viewsByStory || viewsByStory.length === 0) return [];
    const allDates = new Set<string>();
    viewsByStory.forEach(s => s.data.forEach(d => allDates.add(d.date)));
    const sorted = Array.from(allDates).sort();
    return sorted.map(date => {
      const row: Record<string, any> = { date };
      viewsByStory.forEach(s => {
        const found = s.data.find(d => d.date === date);
        row[`story_${s.id}`] = found?.views || 0;
      });
      return row;
    });
  })();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2" data-testid="text-analytics-title">
            <BarChart3 className="w-6 h-6" />
            إحصائياتي
          </h1>
          <p className="text-muted-foreground mt-1">تابع أداء أعمالك وتفاعل جمهورك</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryLoading || tipsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card data-testid="card-total-views">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">إجمالي المشاهدات</span>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-total-views">
                    <LtrNum>{summary?.totalViews || 0}</LtrNum>
                  </div>
                  {(summary?.viewsThisMonth || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <LtrNum>{summary?.viewsThisMonth}</LtrNum> هذا الشهر
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-followers-month">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">متابعون جدد هذا الشهر</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-followers-month">
                    +<LtrNum>{summary?.followersThisMonth || 0}</LtrNum>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    إجمالي: <LtrNum>{summary?.followerCount || 0}</LtrNum>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-total-tips">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">إجمالي الإكراميات</span>
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-tips-card">
                    $<LtrNum>{(totalTipsCents / 100).toFixed(2)}</LtrNum>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-most-read">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">الأكثر قراءة</span>
                    <Star className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {mostReadWork ? (
                    <>
                      <div className="text-sm font-medium truncate" data-testid="text-most-read-title">
                        {mostReadWork.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /><LtrNum>{mostReadWork.views}</LtrNum></span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /><LtrNum>{mostReadWork.reactions}</LtrNum></span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground" data-testid="text-no-most-read">لا يوجد</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card data-testid="card-views-chart">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  المشاهدات (آخر 30 يوم)
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === "aggregate" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setViewMode("aggregate")}
                    data-testid="button-views-aggregate"
                  >
                    <Layers className="w-3 h-3 ml-1" />
                    إجمالي
                  </Button>
                  <Button
                    variant={viewMode === "per-story" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setViewMode("per-story")}
                    data-testid="button-views-per-story"
                  >
                    <BookOpen className="w-3 h-3 ml-1" />
                    حسب العمل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "aggregate" ? (
                viewsLoading ? (
                  <div className="h-64 flex items-center justify-center"><Skeleton className="w-full h-48" /></div>
                ) : viewsSeries && viewsSeries.length > 0 ? (
                  <div className="h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={viewsSeries}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          labelFormatter={(v) => `${v}`}
                          formatter={(v: number) => [`${v} مشاهدة`, "المشاهدات"]}
                          contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                        />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm" data-testid="text-views-empty">
                    لا توجد بيانات مشاهدات بعد
                  </div>
                )
              ) : (
                viewsByStoryLoading ? (
                  <div className="h-64 flex items-center justify-center"><Skeleton className="w-full h-48" /></div>
                ) : viewsByStory && viewsByStory.length > 0 ? (
                  <div className="h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={perStoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ direction: "rtl", fontSize: 11, borderRadius: 8 }}
                          formatter={(v: number, name: string) => {
                            const story = viewsByStory.find(s => `story_${s.id}` === name);
                            return [`${v} مشاهدة`, story?.title || name];
                          }}
                        />
                        <Legend
                          formatter={(value: string) => {
                            const story = viewsByStory.find(s => `story_${s.id}` === value);
                            const title = story?.title || value;
                            return title.length > 20 ? title.slice(0, 20) + "..." : title;
                          }}
                          wrapperStyle={{ fontSize: 11, direction: "rtl" }}
                        />
                        {viewsByStory.map((s, i) => (
                          <Line
                            key={s.id}
                            type="monotone"
                            dataKey={`story_${s.id}`}
                            stroke={STORY_COLORS[i % STORY_COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm" data-testid="text-views-per-story-empty">
                    لا توجد أعمال منشورة بعد
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-followers-chart">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                المتابعون الجدد (أسبوعي)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {followersLoading ? (
                <div className="h-64 flex items-center justify-center"><Skeleton className="w-full h-48" /></div>
              ) : followerHistory && followerHistory.length > 0 ? (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={followerHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(v) => `أسبوع ${v}`}
                        formatter={(v: number) => [`${v} متابع`, "المتابعون"]}
                        contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm" data-testid="text-followers-empty">
                  لا توجد بيانات متابعين بعد
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card data-testid="card-top-works">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                أكثر الأعمال مشاهدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : summary?.topEssays && summary.topEssays.length > 0 ? (
                <div className="space-y-3">
                  {summary.topEssays.map((essay, i) => (
                    <div key={essay.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`row-top-work-${essay.id}`}>
                      <span className="text-lg font-bold text-muted-foreground w-6 text-center"><LtrNum>{i + 1}</LtrNum></span>
                      <div className="flex-1 min-w-0">
                        {essay.shareToken ? (
                          <a href={`/essay/${essay.shareToken}`} className="text-sm font-medium truncate block hover:text-primary transition-colors" data-testid={`link-work-${essay.id}`}>
                            {essay.title}
                          </a>
                        ) : (
                          <span className="text-sm font-medium truncate block">{essay.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /><LtrNum>{essay.views}</LtrNum></span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /><LtrNum>{essay.reactions}</LtrNum></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm" data-testid="text-no-works">
                  لا توجد أعمال منشورة بعد
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-completion">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                معدل إتمام القراءة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completionLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : completionData && completionData.length > 0 ? (
                <div className="space-y-3">
                  {completionData.map((item) => (
                    <div key={item.id} className="space-y-1" data-testid={`row-completion-${item.id}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1 ml-2">{item.title}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          <LtrNum>{item.completionRate}</LtrNum>%
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.completionRate}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span><LtrNum>{item.readers}</LtrNum> قارئ</span>
                        <span><LtrNum>{item.completions}</LtrNum> أتموا القراءة</span>
                        <span><LtrNum>{item.totalChapters}</LtrNum> فصل</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm" data-testid="text-no-completion">
                  لا توجد بيانات قراءة بعد
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card data-testid="card-countries">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                أكثر الدول قراءة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {countriesLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : countriesData && countriesData.length > 0 ? (
                <div className="space-y-3">
                  {countriesData.map((c, i) => {
                    const maxCount = countriesData[0]?.count || 1;
                    const countryName = countryCodeToName[c.country] || c.country;
                    return (
                      <div key={c.country} className="flex items-center gap-3" data-testid={`row-country-${i}`}>
                        <span className="text-sm w-20 flex-shrink-0">{countryName}</span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded transition-all flex items-center justify-end px-2"
                            style={{ width: `${(c.count / maxCount) * 100}%` }}
                          >
                            <span className="text-[10px] text-primary-foreground font-medium"><LtrNum>{c.count}</LtrNum></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm" data-testid="text-no-countries">
                  لا تتوفر بيانات جغرافية بعد
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-tips">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="w-4 h-4" />
                الإكراميات المستلمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tipsLoading ? (
                <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : tipsData && (tipsData.totalCents > 0 || tipsData.tips.length > 0) ? (
                <>
                  <div className="text-center mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الإكراميات</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-tips">
                      $<LtrNum>{(tipsData.totalCents / 100).toFixed(2)}</LtrNum>
                    </p>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tipsData.tips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-2 rounded border text-sm" data-testid={`row-tip-${tip.id}`}>
                        <div>
                          <span className="text-foreground font-medium">
                            {tip.fromName ? tip.fromName : (tip.fromUserId ? "قارئ" : "مجهول")}
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            {new Date(tip.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-green-600 dark:text-green-400">
                          $<LtrNum>{(tip.amountCents / 100).toFixed(2)}</LtrNum>
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm" data-testid="text-no-tips">
                  لم تتلق إكراميات بعد
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <AnalyticsTopQuotes userId={user?.claims?.sub} />
        <AnalyticsCourseStats />
      </div>
    </div>
  );
}

function AnalyticsCourseStats() {
  const { data: stats } = useQuery<{ totalCourses: number; totalEnrollments: number; totalRevenue: number }>({
    queryKey: ["/api/author/course-stats"],
    staleTime: 120_000,
  });
  const { data: myCourses } = useQuery<any[]>({ queryKey: ["/api/courses/my"] });

  if (!stats || stats.totalCourses === 0) return null;

  return (
    <Card data-testid="card-analytics-courses">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="w-5 h-5 text-primary/70" />
          دوراتي التعليمية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold"><LtrNum>{stats.totalCourses}</LtrNum></p>
            <p className="text-xs text-muted-foreground">دورة</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold"><LtrNum>{stats.totalEnrollments}</LtrNum></p>
            <p className="text-xs text-muted-foreground">طالب</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600"><LtrNum>${(stats.totalRevenue / 100).toFixed(0)}</LtrNum></p>
            <p className="text-xs text-muted-foreground">إيرادات</p>
          </div>
        </div>
        {myCourses && myCourses.length > 0 && (
          <div className="space-y-2">
            {myCourses.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm" data-testid={`analytics-course-${c.id}`}>
                <span className="font-medium truncate flex-1">{c.title}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span><LtrNum>{c.enrollmentCount}</LtrNum> طالب</span>
                  <Badge variant={c.isPublished ? "default" : "secondary"} className="text-[10px]">
                    {c.isPublished ? "منشورة" : "مسودة"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
