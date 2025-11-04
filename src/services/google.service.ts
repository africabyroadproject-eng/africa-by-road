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
            console.log('Attempting to verify Google ID token...');
            console.log('Token length:', idToken?.length);
            console.log('Using audience:', process.env.GOOGLE_CLIENT_ID);
            
            // Allow any audience in development mode for testing
            const options: {idToken: string; audience?: string} = { idToken };
            
            if (process.env.NODE_ENV !== 'development') {
                options.audience = process.env.GOOGLE_CLIENT_ID;
            } else {
                console.log('Development mode: skipping audience validation');
            }
            
            const ticket = await this.client.verifyIdToken(options);
            
            const payload = ticket.getPayload();
            console.log('Token verification successful. Email:', payload?.email);
            return payload || null;
        } catch (error) {
            console.error('Failed to verify Google id_token:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
            }
            return null;
        }
    }
}

export const googleAuthService = new GoogleAuthService();