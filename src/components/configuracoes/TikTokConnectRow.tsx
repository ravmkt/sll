import { Music2 } from 'lucide-react';
import SocialConnectRow from './SocialConnectRow';
import { getTikTokAuthUrl } from '@/services/socialIntegrationsService';

export default function TikTokConnectRow({ storeId, className }: { storeId: string; className?: string }) {
  return (
    <SocialConnectRow
      storeId={storeId}
      platform="tiktok"
      label="TikTok"
      className={className}
      iconClassName="bg-slate-900"
      icon={<Music2 className="h-6 w-6" />}
      getAuthUrl={() => getTikTokAuthUrl(storeId)}
    />
  );
}