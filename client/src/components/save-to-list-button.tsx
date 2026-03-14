import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Plus, Check, Loader2 } from "lucide-react";

interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  item_count: number;
}

interface SaveToListButtonProps {
  projectId: number;
  variant?: "icon" | "full";
  className?: string;
}

export function SaveToListButton({ projectId, variant = "icon", className = "" }: SaveToListButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [savedTo, setSavedTo] = useState<number | null>(null);

  const { data: collections } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: (collectionId: number) =>
      apiRequest("POST", `/api/collections/${collectionId}/items`, { projectId }),
    onSuccess: (_, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setSavedTo(collectionId);
      toast({ title: "تم الحفظ في القائمة" });
      setTimeout(() => setSavedTo(null), 2000);
    },
    onError: () => toast({ title: "فشل في الحفظ", variant: "destructive" }),
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/collections", {
        name: newListName.trim(),
        isPublic: false,
      });
      const col = await res.json();
      await apiRequest("POST", `/api/collections/${col.id}/items`, { projectId });
      return col;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setNewListName("");
      setShowNewList(false);
      toast({ title: "تم إنشاء القائمة وحفظ العمل" });
    },
    onError: () => toast({ title: "فشل في الإنشاء", variant: "destructive" }),
  });

  if (!user) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (variant === "full") {
    return (
      <div onClick={handleClick}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`gap-2 ${className}`} data-testid={`button-save-to-list-${projectId}`}>
              <Bookmark className="w-4 h-4" />
              حفظ في قائمة القراءة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" dir="rtl" className="w-56" data-testid="dropdown-save-to-list">
            {collections && collections.length > 0 ? (
              collections.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => addMutation.mutate(col.id)}
                  disabled={addMutation.isPending}
                  data-testid={`menuitem-list-${col.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{col.name}</span>
                    {savedTo === col.id && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">لا توجد قوائم بعد</div>
            )}
            <DropdownMenuSeparator />
            {showNewList ? (
              <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="اسم القائمة الجديدة"
                  className="h-8 text-sm"
                  data-testid="input-new-list-name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newListName.trim()) createAndAddMutation.mutate();
                  }}
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={!newListName.trim() || createAndAddMutation.isPending}
                  onClick={() => createAndAddMutation.mutate()}
                  data-testid="button-confirm-new-list"
                >
                  {createAndAddMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "إنشاء وحفظ"}
                </Button>
              </div>
            ) : (
              <DropdownMenuItem onClick={() => setShowNewList(true)} data-testid="menuitem-create-new-list">
                <Plus className="w-4 h-4 ml-2" />
                قائمة جديدة
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div onClick={handleClick}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center justify-center w-7 h-7 rounded-full bg-background/80 hover:bg-background border shadow-sm transition-colors ${className}`}
            data-testid={`button-save-to-list-${projectId}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" dir="rtl" className="w-52" data-testid="dropdown-save-to-list">
          {collections && collections.length > 0 ? (
            collections.map((col) => (
              <DropdownMenuItem
                key={col.id}
                onClick={() => addMutation.mutate(col.id)}
                disabled={addMutation.isPending}
                data-testid={`menuitem-list-${col.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate text-sm">{col.name}</span>
                  {savedTo === col.id && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">لا توجد قوائم بعد</div>
          )}
          <DropdownMenuSeparator />
          {showNewList ? (
            <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="اسم القائمة"
                className="h-7 text-xs"
                data-testid="input-new-list-name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newListName.trim()) createAndAddMutation.mutate();
                }}
              />
              <Button
                size="sm"
                className="w-full h-6 text-[10px]"
                disabled={!newListName.trim() || createAndAddMutation.isPending}
                onClick={() => createAndAddMutation.mutate()}
                data-testid="button-confirm-new-list"
              >
                {createAndAddMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "إنشاء وحفظ"}
              </Button>
            </div>
          ) : (
            <DropdownMenuItem onClick={() => setShowNewList(true)} data-testid="menuitem-create-new-list">
              <Plus className="w-3.5 h-3.5 ml-1.5" />
              <span className="text-sm">قائمة جديدة</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}