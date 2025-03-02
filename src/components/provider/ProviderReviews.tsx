
import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Star, User } from "lucide-react";

interface ProviderReviewsProps {
  providerId: string | undefined;
}

export const ProviderReviews: React.FC<ProviderReviewsProps> = ({ providerId }) => {
  // This would fetch from a reviews table in a real implementation
  const reviews = [
    {
      id: "1",
      patientName: "John Doe",
      avatar: null,
      rating: 5,
      date: "2023-10-15",
      comment: "Dr. Smith was very thorough and took the time to explain everything to me. I felt well cared for during my visit."
    },
    {
      id: "2",
      patientName: "Jane Smith",
      avatar: null,
      rating: 4,
      date: "2023-09-22",
      comment: "Very professional and knowledgeable. The wait time was a bit long, but the quality of care made up for it."
    },
    {
      id: "3",
      patientName: "Michael Johnson",
      avatar: null,
      rating: 5,
      date: "2023-08-30",
      comment: "Excellent experience from start to finish. The doctor was attentive and the staff was friendly and efficient."
    }
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Patient Reviews</h2>
      
      <div className="space-y-6">
        {reviews.map(review => (
          <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                {review.avatar ? (
                  <img src={review.avatar} alt={review.patientName} />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </Avatar>
              <div>
                <p className="font-medium">{review.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex mb-2">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} 
                />
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">{review.comment}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
