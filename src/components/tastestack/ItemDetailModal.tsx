import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TYPE_ICONS, STATUS_META, type MediaType } from "@/lib/constants";
import CoverImage from "@/components/tastestack/CoverImage";
import { Star } from "lucide-react";

export interface ItemDetailProps {
  title: string;
  coverUrl: string;
  type: MediaType;
  apiId: string;
  source: string;
  year: string;
  creator?: string;
  description?: string;
  
  // User specific (from Profile or List)
  rating?: number;
  progressCurrent?: number;
  progressTotal?: number;
  review?: string;
  status?: string;
  isFavorite?: boolean;
  isAdded?: boolean;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  onTrack,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDetailProps | null;
  onTrack?: (item: ItemDetailProps) => void;
  onEdit?: (item: ItemDetailProps) => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-none shadow-2xl">
        {/* Dynamic backdrop header */}
        <div className="relative h-64 w-full bg-muted">
          <div className="absolute inset-0 z-0 opacity-40">
            {item.coverUrl ? (
              <img src={item.coverUrl} alt="Backdrop" className="w-full h-full object-cover blur-md scale-110" />
            ) : null}
          </div>
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/80 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 z-20 flex gap-6 items-end">
            <div className="w-32 rounded-lg overflow-hidden shadow-xl shrink-0 border-4 border-background bg-muted">
              <div className="aspect-[3/4] relative">
                <CoverImage src={item.coverUrl} alt={item.title} icon={TYPE_ICONS[item.type]} sizes="128px" />
              </div>
            </div>
            
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-primary font-bold tracking-wider mb-1">
                <span>{TYPE_ICONS[item.type]}</span>
                <span className="uppercase">{item.type}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight line-clamp-2">
                {item.title}
              </h1>
              <p className="text-muted-foreground mt-1 font-medium">
                {item.creator && <span>{item.creator} • </span>}
                {item.year}
              </p>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              {item.description && (
                <div>
                  <h3 className="font-semibold mb-1">Synopsis</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">
                    {item.description}
                  </p>
                </div>
              )}
              
              {/* User Review Section if available */}
              {item.status && (
                <div className="bg-muted/30 p-4 rounded-xl border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {STATUS_META[item.status as keyof typeof STATUS_META]?.label || item.status}
                    </span>
                    {item.rating ? (
                      <div className="flex items-center gap-1 text-sm font-bold">
                        <Star size={14} className="fill-primary text-primary" />
                        {item.rating}/10
                      </div>
                    ) : null}
                    {item.isFavorite && (
                      <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                        ♥ Favorite
                      </span>
                    )}
                  </div>
                  {item.review ? (
                    <p className="text-sm italic text-foreground/90">"{item.review}"</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No review provided.</p>
                  )}
                </div>
              )}
            </div>

            {onTrack && !item.isAdded && (
              <div className="shrink-0 w-32">
                <Button className="w-full font-bold shadow-md" size="lg" onClick={() => { onTrack(item); onClose(); }}>
                  + Track
                </Button>
              </div>
            )}
            {onTrack && item.isAdded && (
              <div className="shrink-0 w-32">
                {onEdit ? (
                  <Button className="w-full font-bold shadow-sm" size="lg" variant="outline" onClick={() => { onEdit(item); onClose(); }}>
                    Edit Entry
                  </Button>
                ) : (
                  <Button className="w-full font-bold shadow-sm" size="lg" disabled variant="outline">
                    ✓ In Stack
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
