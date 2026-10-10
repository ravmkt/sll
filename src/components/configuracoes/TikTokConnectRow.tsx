import SocialConnectRow from './SocialConnectRow';
import { getTikTokAuthUrl } from '@/services/socialIntegrationsService';

export default function TikTokConnectRow({ storeId, className }: { storeId: string; className?: string }) {
  return (
    <SocialConnectRow
      storeId={storeId}
      platform="tiktok"
      label="TikTok"
      logoSrc="/assets/platforms/tiktok.png"
      className={className}
      getAuthUrl={() => getTikTokAuthUrl(storeId)}
    />
  );
}