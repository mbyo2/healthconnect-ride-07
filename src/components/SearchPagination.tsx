
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSearch } from "@/context/SearchContext";

export const SearchPagination = () => {
  const { 
    isLoading, 
    hasMore, 
    loadMore, 
    currentPage, 
    totalCount 
  } = useSearch();

  return (
    <div className="flex flex-col items-center justify-center space-y-2 pt-4 pb-8">
      <p className="text-sm text-muted-foreground">
        Showing providers {totalCount > 0 ? (currentPage - 1) * 10 + 1 : 0} 
        - {Math.min(currentPage * 10, totalCount)} of {totalCount}
      </p>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1 || isLoading}
          onClick={() => {
            // This would need to be implemented in the context
            // For now we just reset to page 1
            window.scrollTo(0, 0);
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || isLoading}
          onClick={() => {
            loadMore();
            window.scrollTo(0, 0);
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Loading
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
