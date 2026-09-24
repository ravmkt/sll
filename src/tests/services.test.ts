import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';
import { LiveCommerceDatabaseService } from '@/services/LiveCommerceDatabaseService';
import { SLLDatabaseService } from '@/services/SLLDatabaseService';
import * as clients from '@/services/supabaseClients';

describe('Suíte de Testes: Camada de Serviços SLL (Multi-tenant & Schemas)', () => {
  const mockStoreId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VidlyticsDatabaseService (Schema: vidlytics)', () => {
    it('deve ter todos os métodos CRUD essenciais expostos', () => {
      expect(typeof VidlyticsDatabaseService.getVideos).toBe('function');
      expect(typeof VidlyticsDatabaseService.createVideo).toBe('function');
      expect(typeof VidlyticsDatabaseService.updateVideo).toBe('function');
      expect(typeof VidlyticsDatabaseService.deleteVideo).toBe('function');
      expect(typeof VidlyticsDatabaseService.getStories).toBe('function');
      expect(typeof VidlyticsDatabaseService.createStory).toBe('function');
      expect(typeof VidlyticsDatabaseService.deleteStory).toBe('function');
    });

    it('deve chamar supabaseVidlytics para buscar vídeos com store_id correto', async () => {
      const fromSpy = vi.spyOn(clients.supabaseVidlytics, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [{ id: 'video-1', title: 'Vídeo Teste' }], error: null })
          })
        })
      } as any);

      const videos = await VidlyticsDatabaseService.getVideos(mockStoreId);
      expect(fromSpy).toHaveBeenCalledWith('videos');
      expect(videos).toHaveLength(1);
      expect(videos[0].title).toBe('Vídeo Teste');
    });
  });

  describe('LiveCommerceDatabaseService (Schema: live_commerce)', () => {
    it('deve extrair o YouTube Video ID e salvar no schema live_commerce', async () => {
      let insertedPayload: any = null;

      vi.spyOn(clients.supabaseLiveCommerce, 'from').mockReturnValue({
        insert: vi.fn().mockImplementation((payload) => {
          insertedPayload = payload;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'live-1', ...payload },
                error: null
              })
            })
          };
        })
      } as any);

      const result = await LiveCommerceDatabaseService.createLive({
        store_id: mockStoreId,
        title: 'Super Live',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.youtube_video_id).toBe('dQw4w9WgXcQ');
      expect(insertedPayload.youtube_thumbnail_url).toContain('dQw4w9WgXcQ');
      expect(result.id).toBe('live-1');
    });

    it('deve extrair corretamente o ID de URLs curtas do YouTube (youtu.be de 11 caracteres)', async () => {
      let insertedPayload: any = null;

      vi.spyOn(clients.supabaseLiveCommerce, 'from').mockReturnValue({
        insert: vi.fn().mockImplementation((payload) => {
          insertedPayload = payload;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'live-2', ...payload }, error: null })
            })
          };
        })
      } as any);

      await LiveCommerceDatabaseService.createLive({
        store_id: mockStoreId,
        title: 'Live Curta',
        youtube_url: 'https://youtu.be/abcdef12345'
      });

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.youtube_video_id).toBe('abcdef12345');
    });
  });

  describe('SLLDatabaseService (Schema: public)', () => {
    it('deve consultar produtos e assinaturas no cliente public', async () => {
      const fromSpy = vi.spyOn(clients.supabasePublic, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'prod-1', title: 'Camisa' }], error: null })
        })
      } as any);

      const products = await SLLDatabaseService.getProducts(mockStoreId);
      expect(fromSpy).toHaveBeenCalledWith('products');
      expect(products).toHaveLength(1);
    });
  });
});
