export interface LandingPageContent {
    title: string;
    summary: string;
    benefits: string[];
    requirements: string[];
    images: string[];
    ctaButtons: Array<{ text: string; href: string }>;
}

class ContentService {
    public getLandingPageContent(): LandingPageContent {
        return {
            title: 'Africa by Road',
            summary: 'A travel reality show and subscription community exploring Africa through epic road adventures.',
            benefits: [
                'Exclusive behind-the-scenes content',
                'Community access and live discussions',
                'Voting and giveaway participation',
                'Early access to episodes and events'
            ],
            requirements: [
                'Must be 18+ years old',
                'Valid travel documents for selected regions',
                'Healthy enough for road travel',
                'Agree to community guidelines'
            ],
            images: [
                'https://example.com/images/hero.jpg',
                'https://example.com/images/route-map.jpg'
            ],
            ctaButtons: [
                { text: 'Join the Community', href: '/register' },
                { text: 'Learn More', href: '/about' }
            ]
        };
    }
}

export const contentService = new ContentService();