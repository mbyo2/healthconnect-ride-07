import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, RefreshCw } from "lucide-react";

interface DataTableHeaderProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterOptions?: { value: string; label: string }[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  showFilter?: boolean;
  showDownload?: boolean;
  showRefresh?: boolean;
  onDownload?: () => void;
  onRefresh?: () => void;
  extraActions?: React.ReactNode;
}

export const DataTableHeader = ({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filterOptions,
  filterValue,
  onFilterChange,
  showFilter = true,
  showDownload = true,
  showRefresh = false,
  onDownload,
  onRefresh,
  extraActions,
}: DataTableHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64 h-9 text-xs"
          />
        )}
        {showFilter && filterOptions && onFilterChange && (
          <Select value={filterValue} onValueChange={onFilterChange}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex items-center gap-2">
        {extraActions}
        {showFilter && !filterOptions && (
          <Button variant="outline" size="sm" className="text-xs">
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
        )}
        {showRefresh && onRefresh && (
          <Button variant="outline" size="sm" className="text-xs" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        )}
        {showDownload && onDownload && (
          <Button variant="outline" size="sm" className="text-xs" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        )}
      </div>
    </div>
  );
};