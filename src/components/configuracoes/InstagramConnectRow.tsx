import SocialConnectRow from './SocialConnectRow';

const APP_ID = '1735532341065265';

export default function InstagramConnectRow({ storeId, className }: { storeId: string; className?: string }) {
  const redirectUri = `${window.location.origin}/dashboard/integracao`;
  return (
    <SocialConnectRow
      storeId={storeId}
      platform="instagram"
      label="Instagram"
      logoSrc="/assets/platforms/instagram.png"
      className={className}
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