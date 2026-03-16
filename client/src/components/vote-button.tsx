import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import LtrNum from "@/components/ui/ltr-num";

interface VoteButtonProps {
  projectId: number;
  authorId: string;
  onVoted?: (authorId: string, projectId: number, voteCount: number) => void;
  size?: "sm" | "default";
  className?: string;
}

export function VoteButton({ projectId, authorId, onVoted, size = "sm", className }: VoteButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [optimisticVoted, setOptimisticVoted] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const { data } = useQuery<{ voteCount: number; voted: boolean | null }>({
    queryKey: ["/api/projects", projectId, "vote-count"],
    queryFn: () => fetch(`/api/projects/${projectId}/vote-count`).then(r => r.json()),
  });

  const voted = optimisticVoted !== null ? optimisticVoted : (data?.voted ?? false);
  const voteCount = optimisticCount !== null ? optimisticCount : (data?.voteCount ?? 0);

  const voteMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${projectId}/vote`),
    onMutate: () => {
      const newVoted = !voted;
      const newCount = newVoted ? voteCount + 1 : Math.max(0, voteCount - 1);
      setOptimisticVoted(newVoted);
      setOptimisticCount(newCount);
    },
    onSuccess: (data: any) => {
      setOptimisticVoted(data.voted);
      setOptimisticCount(data.voteCount);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vote-count"] });
      if (data.voted && onVoted) {
        onVoted(authorId, projectId, data.voteCount);
      }
    },
    onError: () => {
      setOptimisticVoted(null);
      setOptimisticCount(null);
      toast({ title: "تعذّر التصويت", description: "حاول مرة أخرى", variant: "destructive" });
    },
  });

  const handleClick = () => {
    if (!user) {
      toast({ title: "سجّل دخولك أولاً", description: "يجب تسجيل الدخول للتصويت على الأعمال" });
      return;
    }
    voteMutation.mutate();
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={voteMutation.isPending}
      className={`gap-1.5 transition-colors ${voted ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-400"} ${className ?? ""}`}
      data-testid={`vote-btn-${projectId}`}
      aria-label={voted ? "إلغاء التصويت" : "التصويت لهذا العمل"}
    >
      <Heart className={`w-4 h-4 transition-all ${voted ? "fill-current scale-110" : ""}`} />
      <span className="text-xs" data-testid={`vote-count-${projectId}`}>
        <LtrNum>{voteCount}</LtrNum>
      </span>
    </Button>
  );
}
