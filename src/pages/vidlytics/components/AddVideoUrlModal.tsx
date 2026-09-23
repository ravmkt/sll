import React, { useState } from 'react';
import { X, Link2, AlertCircle, CheckCircle2, Video } from 'lucide-react';

interface AddVideoUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (videoData: { title: string; url: string; platform: string }) => void;
}

export const AddVideoUrlModal: React.FC<AddVideoUrlModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<'youtube' | 'vimeo' | 'direct' | null>(null);

  if (!isOpen) return null;

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    const trimmed = url.trim().toLowerCase();
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      setDetectedPlatform('youtube');
    } else if (trimmed.includes('vimeo.com')) {
      setDetectedPlatform('vimeo');
    } else if (trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.includes('/video/')) {
      setDetectedPlatform('direct');
    } else {
      setDetectedPlatform(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      if (onSuccess) {
        onSuccess({
          title: title.trim() || 'Vídeo Externo',
          url: videoUrl.trim(),
          platform: detectedPlatform || 'direct'
        });
      }
      setVideoUrl('');
      setTitle('');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center">
              <Link2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Adicionar Vídeo via URL</h3>
              <p className="text-xs text-slate-500">Vincule um vídeo externo diretamente à sua biblioteca</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
              Título do Vídeo
            </label>
            <input
              type="text"
              placeholder="Ex: Demonstração de Produto Linha Verão"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
              URL do Vídeo (YouTube, Vimeo ou Link Direto .MP4) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=... ou .mp4"
                value={videoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] transition-all"
              />
              {detectedPlatform && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              )}
            </div>
            {detectedPlatform && (
              <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <span>Plataforma detectada:</span>
                <strong className="uppercase">{detectedPlatform}</strong>
              </p>
            )}
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
            <AlertCircle size={16} className="text-[#0094eb] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Vídeos vinculados por URL não consom espaço da sua cota de armazenamento no plano SLL.
            </p>
          </div>

          {/* Footer Ações */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={isValidating || !videoUrl.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] disabled:opacity-50 text-white text-xs font-bold tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20"
            >
              {isValidating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Video size={14} />
                  <span>VINCULAR VÍDEO</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVideoUrlModal;
