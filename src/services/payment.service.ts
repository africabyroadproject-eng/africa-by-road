export interface PaymentGateway {
    id: 'paystack' | 'flutterwave' | 'stripe';
    displayName: string;
    supportedMethods: string[]; // e.g., ['card', 'bank_transfer', 'mobile_money', 'ussd']
    logoUrl?: string;
}

export interface GatewayOptionsResponse {
    country: string;
    currency: string;
    gateways: PaymentGateway[];
    preferred: PaymentGateway['id'];
}

const GATEWAY_CATALOG: Record<string, PaymentGateway> = {
    paystack: {
        id: 'paystack',
        displayName: 'Paystack',
        supportedMethods: ['card', 'bank_transfer', 'ussd'],
        logoUrl: 'https://assets.paystack.com/images/logo.png'
    },
    flutterwave: {
        id: 'flutterwave',
        displayName: 'Flutterwave',
        supportedMethods: ['card', 'bank_transfer', 'mobile_money'],
        logoUrl: 'https://flutterwave.com/images/logo.png'
    },
    stripe: {
        id: 'stripe',
        displayName: 'Stripe',
        supportedMethods: ['card'],
        logoUrl: 'https://stripe.com/img/v3/home/twitter.png'
    }
};

const COUNTRY_GATEWAYS: Record<string, { currency: string; gateways: PaymentGateway['id'][]; preferred: PaymentGateway['id'] }> = {
    NG: { currency: 'NGN', gateways: ['paystack', 'flutterwave'], preferred: 'paystack' },
    GH: { currency: 'GHS', gateways: ['paystack', 'flutterwave'], preferred: 'paystack' },
    KE: { currency: 'KES', gateways: ['flutterwave'], preferred: 'flutterwave' },
    ZA: { currency: 'ZAR', gateways: ['paystack', 'flutterwave'], preferred: 'paystack' }
};

const DEFAULT_GATEWAYS = { currency: 'USD', gateways: ['stripe'] as PaymentGateway['id'][], preferred: 'stripe' as const };

class PaymentService {
    public getGatewayOptions(rawCountry?: string): GatewayOptionsResponse {
        const country = this.normalizeCountry(rawCountry);
        const config = COUNTRY_GATEWAYS[country] || DEFAULT_GATEWAYS;

        return {
            country,
            currency: config.currency,
            gateways: config.gateways.map((id) => GATEWAY_CATALOG[id]),
            preferred: config.preferred
        };
    }

    private normalizeCountry(country?: string): string {
        if (!country) return 'INTL';
        return country.trim().toUpperCase();
    }
}

export const paymentService = new PaymentService();