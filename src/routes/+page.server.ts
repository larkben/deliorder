export const load = async (event) => {
    console.log('AUTH_SECRET exists?', !!process.env.AUTH_SECRET);
    console.log('GOOGLE_CLIENT_ID exists?', !!process.env.GOOGLE_CLIENT_ID);
    console.log('ENV VARS:', Object.keys(process.env).filter(k => k.startsWith('AUTH') || k.startsWith('GOOGLE')));
    
    const session = await event.locals.auth();
    
    return {
        session,
    };
};