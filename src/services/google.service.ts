import { OAuth2Client, TokenPayload } from 'google-auth-library';

class GoogleAuthService {
    private client: OAuth2Client;

    constructor() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        console.log('Google Auth Service initialized with:');
        console.log('- Client ID available:', !!clientId);
        console.log('- Client Secret available:', !!clientSecret);
        
        if (!clientId) {
            console.warn('GOOGLE_CLIENT_ID not set. Google verification will fail unless configured.');
        }
        
        if (!clientSecret) {
            console.warn('GOOGLE_CLIENT_SECRET not set. Google verification may fail for some operations.');
        }
        
        this.client = new OAuth2Client({
            clientId,
            clientSecret
        });
    }

    public async verifyIdToken(idToken: string): Promise<TokenPayload | null> {
        try {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            if (!clientId) {
                console.error('GOOGLE_CLIENT_ID not configured');
                return null;
            }

            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: clientId,
            });
            
            const payload = ticket.getPayload();
            return payload || null;
        } catch (error) {
            console.error('Failed to verify Google id_token:', error);
            return null;
        }
    }
}

export const googleAuthService = new GoogleAuthService();