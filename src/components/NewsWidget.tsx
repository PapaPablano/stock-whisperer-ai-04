import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSymbolNews, useMarketNews, type NewsArticle } from "@/hooks/useStockNews";
import { ExternalLink, Newspaper, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsWidgetProps {
  symbol?: string;
  limit?: number;
  height?: number;
  showImages?: boolean;
}

const NewsArticleItem = ({ article, showImages = true }: { article: NewsArticle; showImages?: boolean }) => {
  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });
  const mainImage = article.images?.find(img => img.size === 'large' || img.size === 'small')?.url;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group hover:bg-accent/50 rounded-lg p-3 transition-colors"
    >
      <div className="flex gap-3">
        {showImages && mainImage && (
          <div className="flex-shrink-0">
            <img
              src={mainImage}
              alt={article.headline}
              className="w-20 h-20 object-cover rounded-md"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {article.headline}
          </h3>
          {article.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
            {article.source && (
              <Badge variant="outline" className="text-xs">
                {article.source}
              </Badge>
            )}
            {article.symbols && article.symbols.length > 0 && (
              <div className="flex gap-1">
                {article.symbols.slice(0, 3).map((sym) => (
                  <Badge key={sym} variant="secondary" className="text-xs">
                    {sym}
                  </Badge>
                ))}
                {article.symbols.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{article.symbols.length - 3}
                  </Badge>
                )}
              </div>
            )}
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </a>
  );
};

const NewsSkeletons = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </>
);

/**
 * NewsWidget component displays real-time news from Alpaca
 * Can show news for a specific symbol or general market news
 * 
 * @example
 * // Show news for a specific stock
 * <NewsWidget symbol="AAPL" limit={10} />
 * 
 * @example
 * // Show general market news
 * <NewsWidget limit={20} />
 */
export const NewsWidget = ({ 
  symbol, 
  limit = 10, 
  height = 600,
  showImages = true 
}: NewsWidgetProps) => {
  // Always call both hooks to satisfy React hooks rules
  const symbolNewsQuery = useSymbolNews(symbol || 'AAPL', limit);
  const marketNewsQuery = useMarketNews(limit);
  
  // Use appropriate query based on whether symbol is provided
  const newsQuery = symbol ? symbolNewsQuery : marketNewsQuery;
  const { data: newsData, isLoading, error } = newsQuery;

  const title = symbol ? `${symbol} News` : "Market News";
  const description = symbol 
    ? `Latest news and updates for ${symbol}`
    : "Latest market news and analysis";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          {newsData?.cacheHit && (
            <Badge variant="outline" className="text-xs">
              Cached
            </Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea style={{ height: `${height - 120}px` }} className="px-4">
          {isLoading && <NewsSkeletons />}
          
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Failed to load news
              </p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}
          
          {!isLoading && !error && newsData?.articles && newsData.articles.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No news articles found
              </p>
            </div>
          )}
          
          {!isLoading && !error && newsData?.articles && newsData.articles.length > 0 && (
            <div className="space-y-1">
              {newsData.articles.map((article) => (
                <NewsArticleItem 
                  key={article.id} 
                  article={article}
                  showImages={showImages}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/**
 * Compact version of NewsWidget for sidebar or smaller spaces
 */
export const CompactNewsWidget = ({ symbol, limit = 5 }: { symbol?: string; limit?: number }) => {
  return (
    <NewsWidget 
      symbol={symbol} 
      limit={limit} 
      height={400}
      showImages={false}
    />
  );
};
