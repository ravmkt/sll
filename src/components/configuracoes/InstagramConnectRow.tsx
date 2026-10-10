import SocialConnectRow from './SocialConnectRow';

const APP_ID = '1735532341065265';

export default function InstagramConnectRow({ storeId, className }: { storeId: string; className?: string }) {
  const redirectUri = `${window.location.origin}/dashboard/integracao`;
  return (
    <SocialConnectRow
      storeId={storeId}
      platform="instagram"
      label="Instagram"
      className={className}
      iconClassName="bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600"
      icon={
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      }
      prepare={() => {
        sessionStorage.setItem('ig_redirect_uri', redirectUri);
        sessionStorage.removeItem('ig_return');
        localStorage.setItem('sll_oauth_store_id', storeId);
      }}
      getAuthUrl={async () => {
        const params = new URLSearchParams({
          client_id: APP_ID,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'instagram_business_basic',
          state: storeId,
        });
        return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
      }}
    />
  );
}