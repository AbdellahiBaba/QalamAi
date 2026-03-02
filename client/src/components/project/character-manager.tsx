import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, X, Plus } from "lucide-react";
import type { ProjectData } from "./types";
import { roleLabel } from "./types";

interface CharacterManagerProps {
  project: ProjectData;
  projectId: string;
}

export function CharacterManager({ project, projectId }: CharacterManagerProps) {
  const { toast } = useToast();
  const [suggestedChars, setSuggestedChars] = useState<Array<{ name: string; role: string; background: string; traits: string }>>([]);

  const suggestCharsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/suggest-characters`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuggestedChars(data);
    },
    onError: () => {
      toast({ title: "فشل في اقتراح الشخصيات", variant: "destructive" });
    },
  });

  const addCharacterMutation = useMutation({
    mutationFn: async (char: { name: string; role: string; background: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/characters`, char);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تمت إضافة الشخصية" });
    },
    onError: () => {
      toast({ title: "فشل في إضافة الشخصية", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="font-serif text-lg font-semibold">الشخصيات ({project.characters?.length || 0})</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => suggestCharsMutation.mutate()}
          disabled={suggestCharsMutation.isPending}
          data-testid="button-suggest-characters"
        >
          {suggestCharsMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ الاقتراح...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5 ml-1" /> اقتراح شخصيات</>
          )}
        </Button>
      </div>

      {suggestedChars.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-serif font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                اقتراحات أبو هاشم
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setSuggestedChars([])} data-testid="button-dismiss-suggestions">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {suggestedChars.map((char, i) => (
                <div key={i} className="p-4 rounded-lg bg-background space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif font-semibold">{char.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{char.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{char.background}</p>
                  {char.traits && <p className="text-xs text-primary/80">{char.traits}</p>}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      addCharacterMutation.mutate({ name: char.name, role: char.role, background: char.background });
                      setSuggestedChars(prev => prev.filter((_, idx) => idx !== i));
                    }}
                    data-testid={`button-add-suggested-char-${i}`}
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    إضافة
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.characters?.map((char) => (
          <Card key={char.id}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-semibold" data-testid={`text-char-${char.id}`}>
                  {char.name}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {roleLabel(char.role)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{char.background}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {project.relationships && project.relationships.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-serif text-lg font-semibold">العلاقات</h3>
            <div className="space-y-3">
              {project.relationships.map((rel) => {
                const c1 = project.characters?.find(c => c.id === rel.character1Id);
                const c2 = project.characters?.find(c => c.id === rel.character2Id);
                return (
                  <div key={rel.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{c1?.name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-primary">{rel.relationship}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-medium">{c2?.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
