export interface PublicDramaProfile {
  id: string;
  title: string;
  posterUrl: string | null;
  meta: {
    episodeCount: number | null;
    genres: string[];
    tags: string[];
    releaseDate: string | null;
    platforms: string[];
  };
  summary: {
    storyBackground: string | null;
    coreHighlights: string[];
    synopsis: string | null;
  };
  characterPreview: {
    visibleCharacters: Array<{
      name: string;
      role: string;
      shortBio: string;
    }>;
    lockedCount: number;
  };
  outlinePreview: {
    previewText: string | null;
    locked: boolean;
  };
  episodePreview: {
    visibleEpisodes: Array<{
      episodeNumber: number;
      title: string;
      shortSummary: string;
    }>;
    lockedCount: number;
  };
  access: {
    isPublic: boolean;
    canPreview: boolean;
  };
  notices: {
    copyrightNotice: string;
    updateTime: string | null;
  };
  seo: {
    title: string | null;
    description: string | null;
  };
  updatedAt: string | null;
}
