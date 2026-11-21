import { Heart, MessageCircle, Send, Check } from 'lucide-react';
import { channelByKey } from './lib';

export interface PreviewItem {
  channelKey: string;
  imageUrl: string;
  caption: string;
}

const Caption = ({ text, className = '' }: { text: string; className?: string }) => (
  <p className={`whitespace-pre-wrap break-words text-[13px] leading-snug ${className}`}>{text}</p>
);

function WhatsAppGroup({ it }: { it: PreviewItem }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#e7ddd3]">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white">
        <div className="h-7 w-7 rounded-full bg-white/30" />
        <span className="text-sm font-semibold">Grupo de ofertas</span>
      </div>
      <div className="p-3">
        <div className="ml-auto max-w-[270px] rounded-lg rounded-tr-none bg-[#d9fdd3] p-1 shadow-sm">
          <img src={it.imageUrl} alt="" className="w-full rounded-md" />
          <Caption text={it.caption} className="px-1.5 pt-1.5 text-slate-800" />
          <div className="flex items-center justify-end gap-1 px-1.5 pb-1 text-[10px] text-slate-500">
            10:21 <Check size={12} className="text-[color:var(--sll-b-brand)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppStatus({ it }: { it: PreviewItem }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <div className="absolute left-2 right-2 top-2 h-0.5 rounded bg-white/70" />
      <img src={it.imageUrl} alt="" className="w-full" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <Caption text={it.caption} className="line-clamp-4 text-center text-white" />
      </div>
    </div>
  );
}

function InstagramFeed({ it }: { it: PreviewItem }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 p-2.5">
        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 to-fuchsia-600" />
        <span className="text-xs font-semibold text-slate-800">sualoja</span>
      </div>
      <img src={it.imageUrl} alt="" className="w-full" />
      <div className="flex gap-3 p-2.5 text-slate-800">
        <Heart size={20} /> <MessageCircle size={20} /> <Send size={20} />
      </div>
      <div className="px-2.5 pb-3">
        <Caption text={it.caption} className="text-slate-800" />
      </div>
    </div>
  );
}

function Generic({ it }: { it: PreviewItem }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <img src={it.imageUrl} alt="" className="w-full" />
      <div className="p-2.5">
        <Caption text={it.caption} className="text-slate-700" />
      </div>
    </div>
  );
}

function Mock({ it }: { it: PreviewItem }) {
  const k = it.channelKey;
  if (k === 'whatsapp_status') return <WhatsAppStatus it={it} />;
  if (k.startsWith('whatsapp')) return <WhatsAppGroup it={it} />;
  if (k === 'instagram_feed') return <InstagramFeed it={it} />;
  if (k === 'instagram_story' || k === 'facebook_story') return <WhatsAppStatus it={it} />;
  return <Generic it={it} />;
}

export default function ChannelPreviews({ items }: { items: PreviewItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => (
        <div key={it.channelKey} className="mx-auto w-full max-w-[300px]">
          <p className="mb-1.5 text-xs font-semibold text-slate-500">{channelByKey(it.channelKey)?.label ?? it.channelKey}</p>
          <Mock it={it} />
        </div>
      ))}
    </div>
  );
}