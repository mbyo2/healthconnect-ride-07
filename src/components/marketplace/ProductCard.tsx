
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarketplaceProduct } from '@/types/marketplace';
import { ShoppingCart, Pill, AlertTriangle } from 'lucide-react';

interface ProductCardProps {
  product: MarketplaceProduct;
  onAddToCart: (product: MarketplaceProduct) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{product.medication_name}</CardTitle>
              {product.generic_name && (
                <p className="text-sm text-muted-foreground">{product.generic_name}</p>
              )}
            </div>
          </div>
          {product.requires_prescription && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Rx Required
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-2 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Dosage:</span>
            <span className="font-medium">{product.dosage}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Price:</span>
            <span className="text-lg font-bold text-green-600">K{product.price}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">In Stock:</span>
            <span className={`font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock_quantity} units
            </span>
          </div>

          {product.pharmacy && (
            <div className="text-sm text-muted-foreground">
              <strong>Pharmacy:</strong> {product.pharmacy.name}
            </div>
          )}

          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button 
            onClick={() => onAddToCart(product)}
            disabled={product.stock_quantity === 0}
            className="w-full flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
